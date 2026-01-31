const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { logPaiEvent } = require('../services/pai');

// Apply for job
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, coverLetter, resume } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: 'Job ID is required' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    if (job.isHidden || job.status !== 'open') {
      return res.status(400).json({ message: 'Job is not accepting applications' });
    }

    const existingApplication = await Application.findOne({
      jobId,
      workerId: req.userId
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    const application = new Application({
      jobId,
      workerId: req.userId,
      employerId: job.employerId,
      coverLetter,
      resume
    });

    await application.save();

    await Job.findByIdAndUpdate(jobId, {
      $addToSet: { applicants: req.userId }
    });

    try {
      await Notification.create({
        userId: job.employerId,
        type: 'application.new',
        title: 'New application',
        body: `${job.title} has a new applicant.`,
        link: `/employer/applications/${application._id}`,
        data: { applicationId: application._id, jobId: job._id }
      });
    } catch (error) {}

    await logPaiEvent(req.userId, {
      source: 'jobpost',
      verb: 'job.apply',
      objectId: String(job._id),
      props: {
        title: job.title,
        company: job.company
      }
    });
    res.status(201).json({
      message: 'Application submitted successfully',
      application
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user applications
router.get('/', auth, async (req, res) => {
  try {
    const applications = await Application.find({ workerId: req.userId })
      .populate('jobId')
      .populate('employerId', 'name email company');

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employer applications
router.get('/employer', auth, requireRole('employer'), async (req, res) => {
  try {
    const applications = await Application.find({ employerId: req.userId })
      .populate('jobId')
      .populate('workerId', 'name email phone chatApp chatHandle allowContact profilePicture');

    const sanitized = applications.map((application) => {
      const data = application.toObject();
      if (data.workerId && data.workerId.allowContact !== true) {
        delete data.workerId.email;
        delete data.workerId.phone;
        delete data.workerId.chatApp;
        delete data.workerId.chatHandle;
      }
      return data;
    });

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single application
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('jobId')
      .populate('workerId', 'name email phone chatApp chatHandle allowContact profilePicture')
      .populate('employerId', 'name email company');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (
      application.workerId._id.toString() !== req.userId &&
      application.employerId._id.toString() !== req.userId
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const data = application.toObject();
    if (data.workerId && data.workerId.allowContact !== true) {
      delete data.workerId.email;
      delete data.workerId.phone;
      delete data.workerId.chatApp;
      delete data.workerId.chatHandle;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update application status (employer only)
router.put('/:id', auth, requireRole('employer'), async (req, res) => {
  try {
    const { status } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.employerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    application.status = status;
    await application.save();

    try {
      const job = await Job.findById(application.jobId).select('title');
      await Notification.create({
        userId: application.workerId,
        type: 'application.status',
        title: 'Application status updated',
        body: `Your application${job?.title ? ` for ${job.title}` : ''} is now ${status}.`,
        link: `/my-applications/${application._id}`,
        data: { applicationId: application._id, jobId: application.jobId, status }
      });
    } catch (error) {}

    res.json({ message: 'Application updated', application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete application (employer only)
router.delete('/:id', auth, requireRole('employer'), async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.employerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const jobId = application.jobId;
    const workerId = application.workerId;
    await Application.deleteOne({ _id: application._id });

    if (jobId && workerId) {
      await Job.findByIdAndUpdate(jobId, { $pull: { applicants: workerId } });
    }

    return res.json({ message: 'Application deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
