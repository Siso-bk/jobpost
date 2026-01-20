"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { jobsService } from '@/services/api';

export default function PostJobPage() {
  const searchParams = useSearchParams();
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    company: '',
    location: '',
    jobType: 'full-time',
    status: 'open',
    min: '',
    max: '',
    currency: 'USD',
    logoUrl: '',
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id) {
      setEditId(null);
      return;
    }
    setEditId(id);
    setLoadingJob(true);
    jobsService
      .getJobById(id)
      .then((res) => {
        const job = res.data;
        setForm({
          title: job.title || '',
          description: job.description || '',
          company: job.company || '',
          location: job.location || '',
          jobType: job.jobType || 'full-time',
          status: job.status || 'open',
          min: job.salary?.min ? String(job.salary.min) : '',
          max: job.salary?.max ? String(job.salary.max) : '',
          currency: job.salary?.currency || 'USD',
          logoUrl: job.logoUrl || '',
        });
        setMessage('');
      })
      .catch((err: any) => {
        setMessage(err?.response?.data?.message || 'Failed to load job');
      })
      .finally(() => setLoadingJob(false));
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        company: form.company,
        location: form.location,
        jobType: form.jobType,
        status: form.status,
        logoUrl: form.logoUrl,
        salary: {
          min: form.min ? Number(form.min) : undefined,
          max: form.max ? Number(form.max) : undefined,
          currency: form.currency,
        },
      };
      if (editId) {
        await jobsService.updateJob(editId, payload);
        setMessage('Job updated successfully');
      } else {
        await jobsService.createJob(payload);
        setMessage('Job posted successfully');
        setForm({
          title: '',
          description: '',
          company: '',
          location: '',
          jobType: 'full-time',
          status: 'open',
          min: '',
          max: '',
          currency: 'USD',
          logoUrl: '',
        });
      }
    } catch (err: any) {
      setMessage(err?.response?.data?.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <div className="eyebrow">Employer</div>
        <h2>{editId ? 'Edit Job' : 'Post a Job'}</h2>
        <p className="muted">Create a listing that stands out with clear responsibilities and salary range.</p>
        {message && <p className={message.includes('success') ? '' : 'error-message'}>{message}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Job Title</span>
            <input name="title" placeholder="Senior Product Designer" value={form.title} onChange={handleChange} required />
          </label>
          <label>
            <span>Company</span>
            <input name="company" placeholder="Nimbus Labs" value={form.company} onChange={handleChange} required />
          </label>
          <label>
            <span>Company Logo URL</span>
            <input name="logoUrl" placeholder="https://..." value={form.logoUrl} onChange={handleChange} />
          </label>
          <label>
            <span>Location</span>
            <input name="location" placeholder="Remote or city" value={form.location} onChange={handleChange} required />
          </label>
          <label>
            <span>Job Type</span>
            <select name="jobType" value={form.jobType} onChange={handleChange}>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <label>
            <span>Description</span>
            <textarea name="description" placeholder="Describe responsibilities, requirements, and benefits." value={form.description} onChange={handleChange} required />
          </label>
          <div className="form-grid">
            <label>
              <span>Min Salary</span>
              <input name="min" placeholder="80000" value={form.min} onChange={handleChange} />
            </label>
            <label>
              <span>Max Salary</span>
              <input name="max" placeholder="120000" value={form.max} onChange={handleChange} />
            </label>
            <label>
              <span>Currency</span>
              <input name="currency" placeholder="USD" value={form.currency} onChange={handleChange} />
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={loading || loadingJob}>
            {loadingJob ? 'Loading...' : loading ? (editId ? 'Updating...' : 'Posting...') : (editId ? 'Update Job' : 'Post Job')}
          </button>
        </form>
      </div>
    </div>
  );
}
