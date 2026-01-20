const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Get all jobs (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const { title, location, jobType, category, minSalary, maxSalary, page = 1, limit = 20 } = req.query;
    
    let filter = { status: 'open' };

    if (title) filter.title = { $regex: title, $options: 'i' };
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (jobType) filter.jobType = jobType;
    if (category) filter.category = category;

    if (minSalary || maxSalary) {
      const hasMin = minSalary !== undefined && minSalary !== null && minSalary !== '';
      const hasMax = maxSalary !== undefined && maxSalary !== null && maxSalary !== '';
      const min = hasMin ? Number(minSalary) : undefined;
      const max = hasMax ? Number(maxSalary) : undefined;

      if (min !== undefined && !Number.isNaN(min)) {
        filter['salary.min'] = { $gte: min };
      }
      if (max !== undefined && !Number.isNaN(max)) {
        filter['salary.max'] = { $lte: max };
      }
    }

    const pageNum = Math.max(parseInt(String(page), 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);

    const [items, total] = await Promise.all([
      Job.find(filter)
        .populate('employerId', 'name email company')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * lim)
        .limit(lim),
      Job.countDocuments(filter),
    ]);

    res.json({ items, page: pageNum, limit: lim, total, pages: Math.ceil(total / lim) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employer jobs
router.get('/mine', auth, requireRole('employer'), async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: req.userId })
      .sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('employerId', 'name email company');

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Post new job (employer only)
router.post('/', auth, requireRole('employer'), async (req, res) => {
  try {
    const { title, description, company, location, salary, jobType, category, skills, experienceLevel, logoUrl } = req.body;

    if (!title || !description || !company || !location || !jobType) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const job = new Job({
      title,
      description,
      company,
      location,
      salary,
      jobType,
      category,
      skills: skills || [],
      experienceLevel,
      employerId: req.userId,
      logoUrl
    });

    await job.save();
    res.status(201).json({ message: 'Job posted successfully', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update job (employer only; safe fields)
router.put('/:id', auth, requireRole('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to update this job' });
    }

    const allowed = ['title', 'description', 'company', 'location', 'salary', 'jobType', 'category', 'skills', 'experienceLevel', 'status', 'logoUrl'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) job[key] = req.body[key];
    }
    await job.save();

    res.json({ message: 'Job updated successfully', job });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete job
router.delete('/:id', auth, requireRole('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.employerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this job' });
    }

    await Job.findByIdAndDelete(req.params.id);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
