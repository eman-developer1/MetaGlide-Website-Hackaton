'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Pin, Trash2, Calendar, User, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { api, getStoredUser } from '../../lib/api';

export default function AnnouncementsPage() {
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRole: 'All',
    priority: 'Normal',
    pinned: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const res: any = await api.announcements.list();
      setAnnouncements(res.announcements || []);
    } catch (err: any) {
      toast.error('Failed to load announcements', err.message);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    fetchAnnouncements();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.warning('Missing Fields', 'Title and content are required.');
      return;
    }

    setSubmitting(true);
    try {
      await api.announcements.create(formData);
      toast.success('Announcement Posted!', 'Broadcasted to selected audiences.');
      setCreateModalOpen(false);
      setFormData({
        title: '',
        content: '',
        targetRole: 'All',
        priority: 'Normal',
        pinned: false,
      });
      fetchAnnouncements();
    } catch (err: any) {
      toast.error('Post Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.announcements.delete(id);
      toast.success('Deleted', 'Announcement removed from the board.');
      fetchAnnouncements();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'HR';

  return (
    <DashboardLayout title="Company Announcements">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--navy)] dark:text-white tracking-tight">
              Company Notice Board
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Official bulletins, company milestones, and HR policy broadcasts.
            </p>
          </div>

          {isPrivileged && (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#0A66C2] to-[#10AEE6] text-white hover:opacity-95 transition shadow-sm shadow-[#0A66C2]/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Announcement</span>
            </button>
          )}
        </div>

        {/* Announcements Feed */}
        <div className="space-y-4">
          {announcements.length > 0 ? (
            announcements.map((ann) => (
              <div
                key={ann._id || ann.id}
                className={`p-6 rounded-2xl border transition-all ${
                  ann.pinned
                    ? 'bg-gradient-to-r from-blue-50/70 to-cyan-50/40 dark:from-slate-900 dark:to-slate-900 border-[#0A66C2]/30 shadow-sm'
                    : 'bg-[var(--card)] border-[var(--border)] shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ann.pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#0A66C2] text-white">
                          <Pin className="w-3 h-3" /> Pinned
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ann.priority === 'Urgent'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            : ann.priority === 'Important'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {ann.priority}
                      </span>
                      <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                        Audience: {ann.targetRole}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-extrabold text-[var(--navy)] dark:text-white pt-1">
                      {ann.title}
                    </h3>
                  </div>

                  {isPrivileged && (
                    <button
                      type="button"
                      onClick={() => handleDelete(ann._id || ann.id)}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition"
                      title="Delete Announcement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="mt-3 text-xs sm:text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>

                <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>Author: {ann.authorName}</span>
                  <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <Megaphone className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
              <h4 className="font-bold text-sm">Notice Board Empty</h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Stay tuned for company notices and management announcements.
              </p>
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Create Announcement"
          description="Publish a notice to your organization."
        >
          <form onSubmit={handleCreateSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Q4 Town Hall & Product Launch Schedule"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Target Audience
                </label>
                <select
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
                >
                  <option value="All">All Employees</option>
                  <option value="Employee">Staff Only</option>
                  <option value="HR">HR Only</option>
                  <option value="Admin">Admin Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
                >
                  <option value="Normal">Normal</option>
                  <option value="Important">Important</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text)] mb-1">Content</label>
              <textarea
                required
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full details of the bulletin..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pin-ann"
                checked={formData.pinned}
                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                className="rounded border-[var(--border)] text-[#0A66C2]"
              />
              <label htmlFor="pin-ann" className="text-xs text-[var(--text)] cursor-pointer">
                Pin to top of bulletin board
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0A66C2] text-white hover:bg-[#084e96] transition"
              >
                {submitting ? 'Posting...' : 'Post Notice'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
