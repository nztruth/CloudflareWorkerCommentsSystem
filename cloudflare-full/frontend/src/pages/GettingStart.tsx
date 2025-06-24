import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../utils/api';
import Head from '../components/Head';

export const createProject = async (body: { title: string }) => {
  const res = await apiClient.post("/api/projects", {
    title: body.title,
  });
  return res.data;
};

function GettingStart() {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  async function onClickCreateProject() {
    if (!title.trim()) {
      setError('Please enter a site name');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await createProject({ title });
      setSuccess('Project created! Redirecting to project dashboard...');
      setTimeout(() => {
        navigate(`/dashboard/project/${response.data.id}`);
      }, 1000);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create project';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head title="Add new site - Cusdis" />
      <div className="container mx-auto mt-32 max-w-md">
        <div className="space-y-6">
          <div className="text-center">
            <img width={48} src="/images/artworks/logo-256.png" alt="Cusdis Logo" className="mx-auto mb-4" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-medium">Let's create a new site</h2>
            <p className="text-gray-600">
              Give your site a name, and you can start using Cusdis.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Site name</label>
            <input 
              type="text"
              placeholder="My personal blog" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded">
              {success}
            </div>
          )}

          <div>
            <button 
              onClick={onClickCreateProject} 
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default GettingStart;