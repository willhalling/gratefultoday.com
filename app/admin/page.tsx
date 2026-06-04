'use client';

import { Card, CardBody, CardHeader } from '@heroui/react';
import { Mail, Settings, Users, Video, List, Film, Music, FileAudio, FileText, Columns3 } from 'lucide-react';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

export default function AdminPage() {
  const adminTools = [
    {
      title: 'Newsletter Generator',
      description: 'Generate Daily Gratitude Reflection daily emails',
      icon: Mail,
      href: '/admin/newsletter/generate',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'YouTube Generator',
      description: 'Generate faceless gratitude & sobriety videos',
      icon: Video,
      href: '/admin/youtube/generate',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'YouTube Scripts',
      description: 'View all generated video scripts',
      icon: List,
      href: '/admin/youtube/scripts',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Video Editor',
      description: 'Create slowed + reverb videos',
      icon: Film,
      href: '/admin/video-editor',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Audio Generator',
      description: 'Generate ElevenLabs voiceovers with SSML support',
      icon: Music,
      href: '/admin/audio/generate',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Audio Transcriber',
      description: 'Transcribe uploaded audio using Whisper',
      icon: FileAudio,
      href: '/admin/audio/transcribe',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Invoice Generator',
      description: 'Generate professional PDF invoices',
      icon: FileText,
      href: '/admin/invoice',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Content OS',
      description: 'Generate, curate, edit, and export short-form post content',
      icon: Columns3,
      href: '/admin/content-os',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'User Management',
      description: 'Manage users and permissions (coming soon)',
      icon: Users,
      href: '#',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      disabled: true,
    },
    {
      title: 'Settings',
      description: 'Configure app settings (coming soon)',
      icon: Settings,
      href: '#',
      color: 'text-neutral-600',
      bgColor: 'bg-neutral-50',
      disabled: true,
    },
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-neutral-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-neutral-900 mb-2">Admin Dashboard</h1>
            <p className="text-lg text-neutral-600">Manage Grateful Today tools and content</p>
          </div>

          {/* Admin Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminTools.map((tool) => {
              const Icon = tool.icon;
              const isDisabled = tool.disabled;

              return (
                <Link
                  key={tool.title}
                  href={tool.href}
                  className={`block ${isDisabled ? 'pointer-events-none opacity-60' : 'hover:scale-105 transition-transform'}`}
                >
                  <Card className="h-full border border-neutral-200 hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className={`p-3 rounded-lg ${tool.bgColor} w-fit mb-3`}>
                        <Icon className={`w-6 h-6 ${tool.color}`} />
                      </div>
                    </CardHeader>
                    <CardBody className="pt-0">
                      <h3 className="text-xl font-semibold text-neutral-900 mb-2">{tool.title}</h3>
                      <p className="text-neutral-600 text-sm">{tool.description}</p>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Quick Stats (Optional - can be expanded later) */}
          <div className="mt-12 bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-neutral-600 mb-1">Total Subscribers</p>
                <p className="text-3xl font-bold text-neutral-900">—</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Emails Sent</p>
                <p className="text-3xl font-bold text-neutral-900">—</p>
              </div>
              <div>
                <p className="text-sm text-neutral-600 mb-1">Active Challenges</p>
                <p className="text-3xl font-bold text-neutral-900">—</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
