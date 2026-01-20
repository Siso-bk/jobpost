const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

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
      .populate('workerId', 'name email');

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single application
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('jobId')
      .populate('workerId')
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

    res.json(application);
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

    res.json({ message: 'Application updated', application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
