import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { branches, type Branch } from '../lib/mockData';
import { apiRequest, getApiBaseUrl } from '../lib/api';
import { loadBranches } from '../lib/dataEndpoints';
import { useApiData } from '../lib/useApiData';
import { Badge, Card, IconButton } from './ui';

export function BranchLocationsView() {
  const { data: branchData } = useApiData(loadBranches, branches);
  const [mutableBranches, setMutableBranches] = useState<Branch[]>(branchData);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setMutableBranches(branchData);
  }, [branchData]);

  async function persist(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown) {
    if (!getApiBaseUrl()) return;
    try {
      await apiRequest<unknown>(path, { method, body });
    } catch {
      setNotice('Backend update failed — local view was updated.');
    }
  }

  const addBranch = async () => {
    const name = window.prompt('Branch name', 'New Branch');
    if (!name) return;
    const code = window.prompt('Branch code', `BR-${mutableBranches.length + 1}`);
    if (!code) return;
    const next: Branch = {
      id: `branch-local-${Date.now()}`,
      name,
      code,
      address: 'Bangkok',
      lat: 13.75,
      lng: 100.5,
      manager: 'Unassigned',
      phone: '+66 2 000 0000',
      status: 'Active',
      monthlySalesThb: 0,
    };
    setMutableBranches((prev) => [next, ...prev]);
    setNotice(`Added ${code}.`);
    await persist('POST', '/branches', next);
  };

  const editBranch = async (row: Branch) => {
    const manager = window.prompt(`Edit manager for ${row.code}`, row.manager);
    if (!manager) return;
    const next: Branch = { ...row, manager };
    setMutableBranches((prev) => prev.map((b) => (b.id === row.id ? next : b)));
    setNotice(`Updated ${row.code}.`);
    await persist('PUT', `/branches/${row.id}`, next);
  };

  const deleteBranch = async (row: Branch) => {
    if (!window.confirm(`Delete ${row.code}?`)) return;
    setMutableBranches((prev) => prev.filter((b) => b.id !== row.id));
    setNotice(`Deleted ${row.code}.`);
    await persist('DELETE', `/branches/${row.id}`);
  };

  const rows = useMemo(() => {
    return mutableBranches.filter((b) => {
      if (status !== 'All' && b.status !== status) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        b.name.toLowerCase().includes(s) ||
        b.code.toLowerCase().includes(s) ||
        b.address.toLowerCase().includes(s)
      );
    });
  }, [mutableBranches, q, status]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branch Locations</h1>
          <p className="mt-1 text-slate-600">สาขาในเขตกรุงเทพฯ — พิกัด GPS และผู้จัดการ</p>
        </div>
        <button
          type="button"
          onClick={() => void addBranch()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Branch
        </button>
      </header>
      {notice ? <p className="text-sm text-blue-700">{notice}</p> : null}

      <Card>
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code, address..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Coordinates</th>
                <th className="px-3 py-2">Manager</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-medium text-slate-900">{b.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{b.code}</td>
                  <td className="max-w-xs px-3 py-2 text-slate-700">{b.address}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`https://www.google.com/maps?q=${b.lat},${b.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-blue-700 hover:underline"
                    >
                      {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </td>
                  <td className="px-3 py-2">{b.manager}</td>
                  <td className="px-3 py-2 font-mono text-xs">{b.phone}</td>
                  <td className="px-3 py-2">
                    <Badge variant={b.status === 'Active' ? 'success' : 'neutral'}>{b.status}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <IconButton title="Edit" onClick={() => void editBranch(b)}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton title="Delete" onClick={() => void deleteBranch(b)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
