'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Play, Check, X, Mail, RefreshCw, ExternalLink } from 'lucide-react'

export default function Dashboard() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('new')
  const [scraping, setScraping] = useState(false)

  // 1. Fetch Leads from Supabase
  const fetchLeads = async () => {
    setLoading(true)
    let { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching leads:', error)
    else setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  // 2. Trigger Python Scraper (FastAPI)
  const runScraper = async (platform: string) => {
    setScraping(true)
    try {
      // Calls your local Python backend
      const res = await fetch(`http://127.0.0.1:8000/run/${platform}`, { method: 'POST' })
      const data = await res.json()
      alert(`Scraping finished! Saved ${data.leads_saved} new leads.`)
      fetchLeads() // Refresh list
    } catch (err) {
      alert('Failed to connect to Python backend. Is main.py running?')
      console.error(err)
    } finally {
      setScraping(false)
    }
  }

  // 3. Update Status (Approve/Reject)
  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      // Optimistic update (update UI immediately)
      setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l))
    }
  }

  // Filter logic
  const filteredLeads = leads.filter(l => filter === 'all' ? true : l.status === filter)

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧬 Evolution.com Mission Control</h1>
          <p className="text-gray-500">Automated Lead Generation System</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => runScraper('reddit')}
            disabled={scraping}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            {scraping ? <RefreshCw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
            Run Reddit
          </button>
          <button
            onClick={() => runScraper('facebook')}
            disabled={scraping}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50"
          >
            {scraping ? <RefreshCw className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
            Run Facebook
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto mb-6 flex gap-2">
        {['new', 'approved', 'contacted', 'rejected', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition ${filter === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Leads Grid */}
      <div className="max-w-6xl mx-auto grid gap-6">
        {loading ? (
          <p className="text-center text-gray-500">Loading leads...</p>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed">
            <p className="text-gray-500">No leads found in this category.</p>
          </div>
        ) : (
          filteredLeads.map(lead => (
            <div key={lead.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex gap-6 hover:shadow-md transition">

              {/* Left: Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${lead.score === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {lead.score} Interest
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-gray-100 text-gray-600">
                    {lead.intent}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    via {lead.platform} • {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{lead.content}</h3>

                <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-700 mb-3 border border-slate-100">
                  <span className="font-semibold text-slate-900">AI Context:</span> {lead.context}
                </div>

                <a href={lead.url} target="_blank" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  View Original Post <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Right: Action & Draft */}
              <div className="w-1/3 flex flex-col gap-3 border-l pl-6">
                <p className="text-xs font-semibold text-gray-400 uppercase">AI Suggested Reply</p>
                <textarea
                  readOnly
                  className="w-full text-sm text-gray-600 bg-gray-50 p-3 rounded border resize-none focus:outline-none"
                  rows={4}
                  defaultValue={lead.outreach}
                />

                <div className="flex gap-2 mt-auto">
                  {lead.status === 'new' && (
                    <>
                      <button onClick={() => updateStatus(lead.id, 'approved')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded text-sm font-medium flex justify-center items-center gap-2">
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={() => updateStatus(lead.id, 'rejected')} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded text-sm font-medium flex justify-center items-center gap-2">
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  {lead.status === 'approved' && (
                    <button onClick={() => updateStatus(lead.id, 'contacted')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium flex justify-center items-center gap-2">
                      <Mail className="w-4 h-4" /> Mark Sent
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  )
}