import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import OrganizationLayout from "@/components/organization/OrganizationLayout";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FileText, Vote, BarChart3, Clock, TrendingUp, Check, X,
  Activity, Bell, CheckCircle, Users
} from "lucide-react";

export default function OrganizationDashboard() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activePolicies: 0,
    myProposals: 0,
    pendingVotes: 0,
    totalVotes: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("organization_token");
        const res = await fetch("/api/organization/policies/dashboard-stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          const newStats = { ...data.stats };
          setStats(newStats);
          if (data.notifications) setNotifications(data.notifications);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleDashVote = (id: number) => {
    window.location.href = `/organization/policies/vote/${id}`;
  };

  if (loading) return <OrganizationLayout><DashboardSkeleton /></OrganizationLayout>;

  return (
    <OrganizationLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Organization Dashboard</h1>
            <p className="text-gray-600">Policy management and voting status overview</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-blue-50 border-blue-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/organization/policies/propose'}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-blue-500 rounded-xl mx-auto flex items-center justify-center text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Propose New Policy</h3>
                <p className="text-xs text-gray-500">Create policy proposal</p>
              </div>
              <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 border border-blue-200">Create</Button>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/organization/policies'}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl mx-auto flex items-center justify-center text-white">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Vote on Policies</h3>
                <p className="text-xs text-gray-500">{stats.pendingVotes} pending</p>
              </div>
              <Button className="w-full bg-white text-green-600 hover:bg-green-50 border border-green-200">Open</Button>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 border-yellow-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/organization/policies'}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl mx-auto flex items-center justify-center text-white">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Policy History</h3>
                <p className="text-xs text-gray-500">View all policies</p>
              </div>
              <Button className="w-full bg-white text-yellow-600 hover:bg-yellow-50 border border-yellow-200">View</Button>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.location.href = '/organization/insights'}>
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-purple-500 rounded-xl mx-auto flex items-center justify-center text-white">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Insights</h3>
                <p className="text-xs text-gray-500">Policy analytics</p>
              </div>
              <Button className="w-full bg-white text-purple-600 hover:bg-purple-50 border border-purple-200">View Insights</Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FileText} label="Active Policies" value={stats.activePolicies} sub="Currently applied" color="bg-blue-100 text-blue-600" />
          <StatCard icon={Users} label="My Proposals" value={stats.myProposals} sub="" color="bg-green-100 text-green-600" />
          <StatCard icon={Clock} label="Pending Votes" value={stats.pendingVotes} sub="Awaiting your vote" color="bg-yellow-100 text-yellow-600" />
          <StatCard icon={TrendingUp} label="Total Votes Cast" value={stats.totalVotes} sub="" color="bg-purple-100 text-purple-600" />
        </div>

        {/* Bottom Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Policies List - Left */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-green-600" /> Active Policies
              </CardTitle>
              <CardDescription>Live policies currently influencing AI matching</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivePoliciesList />
            </CardContent>
          </Card>

          {/* Pending Proposals / Voting Queue - Right */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" /> Pending Proposals
              </CardTitle>
              <CardDescription>Policies in voting phase (not yet active)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PendingProposalsList onVote={handleDashVote} />
            </CardContent>
          </Card>
        </div>
      </div>
    </OrganizationLayout>
  );
}

// Sub-component for Pending List to handle logic
function PendingProposalsList({ onVote }: { onVote: (id: number) => void }) {
  const [policies, setPolicies] = useState<any[]>([]);
  // Fetch pending policies
  useEffect(() => {
    const fetchP = async () => {
      const token = localStorage.getItem("organization_token");
      const res = await fetch("/api/organization/policies", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        // Filter for Proposed only
        const pending = data.policies.filter((p: any) => p.status === 'Proposed');
        setPolicies(pending);
      }
    };
    fetchP();
  }, []);

  // Get current User ID (Decoded)
  const [myId, setMyId] = useState<number>(0);
  useEffect(() => {
    const token = localStorage.getItem("organization_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setMyId(payload.organization_id);
      } catch (e) { console.error(e) }
    }
  }, []);

  if (policies.length === 0) return <div className="text-center py-4 text-gray-500">No pending proposals</div>;

  return (
    <div className="space-y-4">
      {policies.map(policy => {
        const isMine = policy.proposer_id === myId;
        const hasVoted = policy.has_voted;

        return (
          <div key={policy.id} className="border border-gray-100 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-gray-900 line-clamp-1">{policy.title}</h4>
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">Voting</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-2">By {policy.proposer_name}</p>
            <p className="text-xs text-gray-600 line-clamp-2 mb-4">{policy.description}</p>

            <div className="flex justify-between items-center">
              <div className="w-24 bg-gray-100 rounded-full h-1.5 ">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '30%' }}></div>
              </div>

              <div className="flex gap-2">
                {isMine ? (
                  <span className="text-xs text-gray-400 italic">My Proposal</span>
                ) : hasVoted ? (
                  <span className="text-xs text-green-600 font-medium">Voted</span>
                ) : (
                  <>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs px-3" onClick={() => onVote(policy.id)}>
                      Vote
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
        <Icon className={`h-6 w-6 ${color.split(' ')[1]}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

function ActivePoliciesList() {
  const [policies, setPolicies] = useState<any[]>([]);
  useEffect(() => {
    const fetchP = async () => {
      const token = localStorage.getItem("organization_token");
      const res = await fetch("/api/organization/policies", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setPolicies(data.policies.filter((p: any) => p.status === 'Active'));
      }
    };
    fetchP();
  }, []);

  if (policies.length === 0) return <div className="text-center py-8 text-gray-500 text-sm">No active policies yet.</div>;

  return (
    <div className="space-y-4">
      {policies.map(policy => (
        <div key={policy.id} className="border border-green-100 bg-green-50/30 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-900 line-clamp-1">{policy.title}</h4>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{policy.description}</p>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{new Date(policy.created_at).toLocaleDateString()}</span>
            <a href={`/organization/policies/vote/${policy.id}`} className="text-blue-600 hover:underline">View Details</a>
          </div>
        </div>
      ))}
    </div>
  );
}
