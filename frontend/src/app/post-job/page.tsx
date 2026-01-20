import { Suspense } from 'react';
import PostJobClient from './PostJobClient';

export default function PostJobPage() {
  return (
    <Suspense
      fallback={
        <div className="page-container">
          <div className="form-card">
            <p className="loading">Loading...</p>
          </div>
        </div>
      }
    >
      <PostJobClient />
    </Suspense>
  );
}
