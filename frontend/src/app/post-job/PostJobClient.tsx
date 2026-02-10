'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { jobsService } from '@/services/api';
import { getMaskedAssetUrl, isInternalAssetUrl } from '@/lib/assets';
import { friendlyError } from '@/lib/feedback';
import { SALARY_PERIODS, SalaryPeriod } from '@/lib/salary';

type StatusTone = 'info' | 'success' | 'fail';

export default function PostJobClient() {
  const searchParams = useSearchParams();
  const [editId, setEditId] = useState<string | null>(null);
  const [loadingJob, setLoadingJob] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const statusTimeoutRef = useRef<number | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    company: '',
    companyLink: '',
    applyLink: '',
    location: '',
    jobType: 'full-time',
    status: 'open',
    min: '',
    max: '',
    currency: 'USD',
    period: 'year' as SalaryPeriod,
    logoUrl: '',
    imageUrls: [] as string[],
  });
  const [status, setStatus] = useState<{ tone: StatusTone; message: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const maxImages = 4;
  const maxImageBytes = 2 * 1024 * 1024;
  const logoUrlMasked = isInternalAssetUrl(form.logoUrl);

  const normalizeLocationOptions = (values: string[]) => {
    const cleaned = values.map((value) => value.trim()).filter(Boolean);
    const unique = Array.from(new Set(cleaned));
    unique.sort((a, b) => {
      const aRemote = /remote/i.test(a);
      const bRemote = /remote/i.test(b);
      if (aRemote && !bRemote) return -1;
      if (!aRemote && bRemote) return 1;
      return a.localeCompare(b);
    });
    if (!unique.some((value) => /remote/i.test(value))) {
      unique.unshift('Remote');
    }
    return unique;
  };

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        window.clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const flashStatus = (tone: StatusTone, message: string, autoDismiss = true) => {
    setStatus({ tone, message });
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }
    if (autoDismiss && (tone === 'success' || tone === 'fail')) {
      statusTimeoutRef.current = window.setTimeout(() => {
        setStatus(null);
      }, 3500);
    }
  };

  useEffect(() => {
    let active = true;
    jobsService
      .listLocations()
      .then((res: any) => {
        if (!active) return;
        const items = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data)
            ? res.data
            : [];
        setLocationOptions(normalizeLocationOptions(items));
      })
      .catch(() => {
        if (!active) return;
        setLocationOptions(['Remote']);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = searchParams?.get('id') ?? '';
    if (!id) {
      setEditId(null);
      return;
    }
    setEditId(id);
    setLoadingJob(true);
    jobsService
      .getJobById(id)
      .then((res: any) => {
        const job = res.data;
        setForm({
          title: job.title || '',
          description: job.description || '',
          company: job.company || '',
          companyLink: job.companyLink || '',
          applyLink: job.applyLink || '',
          location: job.location || '',
          jobType: job.jobType || 'full-time',
          status: job.status || 'open',
          min: job.salary?.min ? String(job.salary.min) : '',
          max: job.salary?.max ? String(job.salary.max) : '',
          currency: job.salary?.currency || 'USD',
          period: (job.salary?.period as SalaryPeriod) || 'year',
          logoUrl: job.logoUrl || '',
          imageUrls: Array.isArray(job.imageUrls) ? job.imageUrls : [],
        });
        setStatus(null);
        setError('');
      })
      .catch((err: any) => {
        setError(friendlyError(err, 'We could not load that job. Please try again.'));
      })
      .finally(() => setLoadingJob(false));
  }, [searchParams]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as HTMLInputElement;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      setStatus(null);
      return;
    }
    const maxSize = 1024 * 1024;
    if (file.size > maxSize) {
      setError('Logo must be under 1MB.');
      setStatus(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = maxImages - form.imageUrls.length;
    if (remaining <= 0) {
      setError(`You can upload up to ${maxImages} images.`);
      setStatus(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    const selected = files.slice(0, remaining);
    const invalidType = selected.filter((file) => !file.type.startsWith('image/'));
    const tooLarge = selected.filter((file) => file.size > maxImageBytes);
    const valid = selected.filter(
      (file) => file.type.startsWith('image/') && file.size <= maxImageBytes
    );

    if (!valid.length) {
      if (invalidType.length) {
        setError('Please upload image files only.');
      } else if (tooLarge.length) {
        setError('Each image must be under 2MB.');
      } else {
        setError('Please choose valid images.');
      }
      setStatus(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }

    if (invalidType.length) {
      setError('Some files were skipped because they are not images.');
    } else if (tooLarge.length) {
      setError('Some images were skipped because they are over 2MB.');
    } else if (files.length > remaining) {
      setError(`Only ${remaining} more image${remaining === 1 ? '' : 's'} allowed.`);
    } else {
      setError('');
    }
    setStatus(null);

    try {
      const dataUrls = await Promise.all(valid.map(readFileAsDataUrl));
      setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, ...dataUrls] }));
    } catch {
      setError('We could not read those images. Please try again.');
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index),
    }));
  };

  const handleRemoveLogo = () => {
    setForm((f) => ({ ...f, logoUrl: '' }));
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    flashStatus('info', editId ? 'Updating job...' : 'Posting job...', false);
    setError('');
    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        company: form.company,
        companyLink: form.companyLink,
        applyLink: form.applyLink,
        location: form.location,
        jobType: form.jobType,
        status: form.status,
        logoUrl: form.logoUrl,
        imageUrls: form.imageUrls,
        salary: {
          min: form.min ? Number(form.min) : undefined,
          max: form.max ? Number(form.max) : undefined,
          currency: form.currency,
          period: form.period,
        },
      };
      if (editId) {
        await jobsService.updateJob(editId, payload);
        flashStatus('success', 'Job updated successfully.');
      } else {
        await jobsService.createJob(payload);
        flashStatus('success', 'Job posted successfully.');
        setForm({
          title: '',
          description: '',
          company: '',
          companyLink: '',
          applyLink: '',
          location: '',
          jobType: 'full-time',
          status: 'open',
          min: '',
          max: '',
          currency: 'USD',
          period: 'year' as SalaryPeriod,
          logoUrl: '',
          imageUrls: [],
        });
        if (logoInputRef.current) {
          logoInputRef.current.value = '';
        }
        if (imageInputRef.current) {
          imageInputRef.current.value = '';
        }
      }
    } catch (err: any) {
      const reason = friendlyError(err, 'We could not save the job. Please try again.');
      flashStatus('fail', `Failed to ${editId ? 'update' : 'post'} job: ${reason}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="form-card">
        <div className="eyebrow">Employer</div>
        <h2>{editId ? 'Edit Job' : 'Post a Job'}</h2>
        <p className="muted">
          Create a listing that stands out with clear responsibilities and salary range.
        </p>
        {status && <p className={`status-message status-${status.tone}`}>{status.message}</p>}
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Job Title</span>
            <input
              name="title"
              placeholder="Senior Product Designer"
              value={form.title}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Company</span>
            <input
              name="company"
              placeholder="Nimbus Labs"
              value={form.company}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            <span>Company link (website or social)</span>
            <input
              name="companyLink"
              placeholder="https://company.com"
              value={form.companyLink}
              onChange={handleChange}
            />
          </label>
          <label>
            <span>Apply link (company application page)</span>
            <input
              name="applyLink"
              placeholder="https://company.com/careers"
              value={form.applyLink}
              onChange={handleChange}
            />
            <span className="muted">
              Optional. If set, JobPost will send applicants to this link.
            </span>
          </label>
          <label>
            <span>Company Logo URL</span>
            <input
              name="logoUrl"
              placeholder={logoUrlMasked ? 'Uploaded logo stored in JobPost' : 'https://...'}
              value={getMaskedAssetUrl(form.logoUrl)}
              onChange={handleChange}
            />
          </label>
          <label>
            <span>Company Logo</span>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} />
            <span className="upload-hint">Upload from device</span>
            {form.logoUrl && (
              <div className="profile-photo-row">
                <img className="logo-preview" src={form.logoUrl} alt="Company logo preview" />
                <button
                  type="button"
                  className="icon-button"
                  onClick={handleRemoveLogo}
                  aria-label="Remove logo"
                >
                  x
                </button>
              </div>
            )}
          </label>
          <label>
            <span>Job Images</span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
            />
            <span className="upload-hint">Upload up to {maxImages} images (2MB each)</span>
            {form.imageUrls.length > 0 && (
              <div className="job-image-grid">
                {form.imageUrls.map((src, index) => (
                  <div key={`${src}-${index}`} className="job-image-thumb">
                    <img src={src} alt={`Job image ${index + 1}`} />
                    <button
                      type="button"
                      className="icon-button job-image-remove"
                      onClick={() => handleRemoveImage(index)}
                      aria-label="Remove image"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}
          </label>
          <label>
            <span>Location</span>
            <input
              name="location"
              list="location-options"
              placeholder="Remote or city"
              value={form.location}
              onChange={handleChange}
              required
            />
            <datalist id="location-options">
              {locationOptions.map((location) => (
                <option key={location} value={location} />
              ))}
            </datalist>
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
            <textarea
              name="description"
              placeholder="Describe responsibilities, requirements, and benefits."
              value={form.description}
              onChange={handleChange}
              required
            />
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
              <input
                name="currency"
                placeholder="USD"
                value={form.currency}
                onChange={handleChange}
              />
            </label>
            <label>
              <span>Per</span>
              <select name="period" value={form.period} onChange={handleChange}>
                {SALARY_PERIODS.map((period) => (
                  <option key={period} value={period}>
                    {period}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={loading || loadingJob}>
            {loadingJob
              ? 'Loading...'
              : loading
                ? editId
                  ? 'Updating...'
                  : 'Posting...'
                : editId
                  ? 'Update Job'
                  : 'Post Job'}
          </button>
        </form>
      </div>
    </div>
  );
}
