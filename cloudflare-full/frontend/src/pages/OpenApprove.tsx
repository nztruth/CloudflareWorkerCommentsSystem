import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Head from '../components/Head';
import { apiClient } from '../utils/api';

interface Comment {
  by_nickname: string;
  by_email: string;
  content: string;
  approved: boolean;
  page: {
    title: string;
    slug: string;
    url: string;
    project: {
      title: string;
    };
  };
}

const approveComment = async ({ token }: { token: string }) => {
  const res = await apiClient.post(`/api/open/approve?token=${token}`);
  return res.data;
};

const appendReply = async ({ replyContent, token }: { replyContent: string; token: string }) => {
  const res = await apiClient.post(`/api/open/approve?token=${token}`, {
    replyContent
  });
  return res.data;
};

function ApprovePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [comment, setComment] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [approveLoading, setApproveLoading] = useState(false);
  const [replyLoading, setReplyLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/error?code=INVALID_TOKEN');
      return;
    }

    fetchComment();
  }, [token, navigate]);

  const fetchComment = async () => {
    try {
      const response = await apiClient.get(`/api/open/approve/comment?token=${token}`);
      setComment(response.data.comment);
    } catch (err: any) {
      const errorCode = err.response?.data?.code || 'INVALID_TOKEN';
      navigate(`/error?code=${errorCode}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproveLoading(true);
    setError('');
    setSuccess('');

    try {
      await approveComment({ token: token! });
      setSuccess('Comment approved successfully!');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to approve comment';
      setError(message);
    } finally {
      setApproveLoading(false);
    }
  };

  const handleAppendReply = async () => {
    if (!replyContent.trim()) {
      setError('Please enter a reply');
      return;
    }

    setReplyLoading(true);
    setError('');
    setSuccess('');

    try {
      await appendReply({ replyContent, token: token! });
      setSuccess('Reply appended successfully!');
      setReplyContent('');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to append reply';
      setError(message);
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head title="New comment - Cusdis" />
        <div className="container mx-auto mt-12 mb-12 max-w-4xl px-4">
          <div className="text-center">Loading...</div>
        </div>
      </>
    );
  }

  if (!comment) {
    return null;
  }

  return (
    <>
      <Head title="New comment - Cusdis" />
      <div className="container mx-auto mt-12 mb-12 max-w-4xl px-4">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold mb-12">Cusdis</h1>

          <div className="space-y-1">
            <p>
              New comment on site <strong>{comment.page.project.title}</strong>, page{' '}
              <a 
                href={comment.page.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-blue-600 hover:text-blue-800"
              >
                {comment.page.title || comment.page.slug}
              </a>
            </p>
            <p>
              From: <strong>{comment.by_nickname}</strong> ({comment.by_email || 'Email not provided'})
            </p>
            <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">
              {comment.content}
            </pre>
          </div>

          <div>
            {comment.approved ? (
              <button 
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-500 rounded cursor-not-allowed"
              >
                Approved
              </button>
            ) : (
              <button 
                onClick={handleApprove}
                disabled={approveLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approveLoading ? 'Approving...' : 'Approve'}
              </button>
            )}
          </div>

          <hr className="my-6" />

          <div className="space-y-4">
            <textarea
              placeholder="Your comment..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
            <p className="text-sm text-gray-600">
              * Appending reply to a comment will automatically approve the comment
            </p>

            <button 
              onClick={handleAppendReply}
              disabled={replyLoading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {replyLoading ? 'Appending...' : 'Append reply'}
            </button>
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
        </div>
      </div>
    </>
  );
}

export default ApprovePage;