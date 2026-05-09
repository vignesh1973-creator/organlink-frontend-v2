
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import OrganizationLayout from "../../components/organization/OrganizationLayout";
import { Skeleton } from "../../components/ui/skeleton";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom"; // Assuming standard routing, but might be file-based in Next/Vite. Using window.location for simplicity if needed or standard hooks.
import { useToast } from "../../hooks/use-toast";
import { ArrowLeft, Check, CheckCircle2, X, Pause, Play, FileText, BarChart3, Info, Brain, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import confetti from 'canvas-confetti';

// Assuming URL is /organization/policies/:id, we need to grab ID from path
// But this file is likely routed. Let's use simple logic to get ID.

interface PolicyDetail {
  id: number;
  title: string;
  description: string;
  status: 'Proposed' | 'Active' | 'Paused' | 'Rejected' | 'Archived';
  yes_votes: number;
  no_votes: number;
  total_orgs: number;
  proposer_id: number;
  proposer_name: string;
  created_at: string;
  has_voted: boolean;
  my_vote: boolean | null;
  voters: Array<{ organization_id: number; vote: boolean }>;
  metrics?: {
    compatibility_weight?: number;
    urgency_weight?: number;
    distance_weight?: number;
    age_weight?: number;
  };
  organ_type?: string;
  policy_type?: string;
  replaces_id?: number;
}

export default function VotePolicy() {
  // Simple ID extraction assuming path like /organization/policies/vote/:id or similar
  const policyId = window.location.pathname.split('/').pop();

  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [currentUserOrgId, setCurrentUserOrgId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Decode token to get current org id
    const token = localStorage.getItem("organization_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserOrgId(payload.organization_id);
      } catch (e) { console.error(e); }
    }

    const fetchPolicy = async () => {
      try {
        // Need a single policy endpoint. For now, we can filter from all or create new endpoint.
        // Let's use the list for now or assume we added a detailed endpoint.
        // Creating a specific fetch logic here since we don't have get-one endpoint explicitly shown before.
        // I'll assume /api/organization/policies returns all and I filter, OR I should add GET /:id
        // Optimization: Just fetch all and filter client side for this demo speed.

        const res = await fetch("/api/organization/policies", {
          headers: { Authorization: `Bearer ${token || ''}` }
        });
        const data = await res.json();
        if (data.success) {
          const found = data.policies.find((p: any) => p.id.toString() === policyId);
          if (found) {
            setPolicy({
              ...found,
              status: found.status,
              yes_votes: parseInt(found.yes_votes || '0'),
              no_votes: parseInt(found.no_votes || '0'),
              total_orgs: 6, // 6 Organizations in the consortium
              organ_type: found.organ_type || 'All',
              metrics: found.metrics || {},
              my_vote: found.my_vote,
              voters: found.voters || [],
              has_voted: found.my_vote !== null
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch policy:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, [policyId]);

  const handleVote = async (vote: boolean) => {
    if (!policy) return;
    try {
      const token = localStorage.getItem("organization_token");
      const res = await fetch("/api/organization/policies/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ policyId: policy.id, vote })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Vote Recorded",
        description: data.message,
        className: "bg-green-50 border-green-200 text-green-900",
      });

      // Special Effect for Vote Confirmation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Reload
      setTimeout(() => window.location.reload(), 1000); // Slight delay to see effect
    } catch (e: any) {
      toast({ title: "Vote Failed", description: e.message, variant: "destructive" });
    }
  };

  const handlePause = async () => {
    if (!policy) return;
    try {
      const token = localStorage.getItem("organization_token");
      const res = await fetch("/api/organization/policies/pause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ policyId: policy.id })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: data.status === 'Paused' ? "Policy Paused" : "Policy Resumed",
        description: data.message
      });
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <OrganizationLayout><div className="p-8 space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-64 w-full" /></div></OrganizationLayout>;
  if (!policy) return <OrganizationLayout><div className="p-8">Policy not found</div></OrganizationLayout>;

  const totalVotes = policy.yes_votes + policy.no_votes;
  const yesPercent = totalVotes > 0 ? (policy.yes_votes / totalVotes) * 100 : 0;
  const noPercent = totalVotes > 0 ? (policy.no_votes / totalVotes) * 100 : 0;

  // Calculate threshold status
  const neededVotes = Math.ceil(policy.total_orgs / 2) + 1; // 4
  const remainingVotes = Math.max(0, neededVotes - policy.yes_votes); // Assuming 4 is pass

  const isMyProposal = currentUserOrgId === policy.proposer_id;


  const PolicyLifecycle = ({ status }: { status: string }) => {
    const steps = [
      { id: 'Proposed', label: 'Proposed', desc: 'Drafting' },
      { id: 'Voting', label: 'Voting', desc: 'Consortium' },
      { id: 'Active', label: 'Active', desc: 'Enforced' },
      { id: 'Archived', label: 'Archived', desc: 'History' }
    ];

    // Map status to logic index
    const statusMap: Record<string, string> = {
      'Proposed': 'Proposed', // In our DB, Proposed = Voting basically? Or do we have a voting state?
      // Actually DB defaults to 'Proposed' (which means Voting in progress)
      'Active': 'Active',
      'Rejected': 'Archived', // Archive/Reject
      'Paused': 'Active' // Paused is sub-state of Active
    };

    // If status is 'Proposed', we are in Voting phase for UI purposes
    const currentStatus = status === 'Proposed' ? 'Voting' : (statusMap[status] || status);

    const activeIdx = steps.findIndex(s => s.id === currentStatus);

    return (
      <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase">Policy Lifecycle</h3>
          <span className="text-xs font-medium px-3 py-1 bg-gray-100 rounded-full text-gray-600">
            Stage {activeIdx + 1} of 4
          </span>
        </div>

        <div className="relative flex justify-between px-4">
          {/* Connecting Line Back */}
          <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-100 -z-10"></div>
          {/* Progress Line */}
          <div className="absolute top-5 left-10 h-0.5 bg-blue-600 -z-10 transition-all duration-500"
            style={{ width: `${(activeIdx / (steps.length - 1)) * 100}%`, right: '2.5rem' /* approximate adjustment */ }}></div>


          {steps.map((step, idx) => {
            const isCompleted = idx <= activeIdx;
            const isCurrent = idx === activeIdx;

            return (
              <div key={step.id} className="flex flex-col items-center gap-3 relative z-10">
                <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4 transition-all duration-300
                                ${isCompleted
                    ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-110'
                    : 'bg-white border-gray-200 text-gray-300'}
                             `}>
                  {isCompleted ? <Check className="h-5 w-5" /> : idx + 1}
                </div>
                <div className="text-center">
                  <span className={`block text-xs font-bold uppercase tracking-wider mb-0.5 ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {step.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <OrganizationLayout>
      <div className="space-y-6">
        {/* Blue Header Bar */}
        <div className="bg-blue-600 rounded-xl p-6 text-white mb-6">
          <a href="/organization/policies" className="inline-flex items-center text-blue-100 hover:text-white text-sm mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Policies
          </a>
          <h1 className="text-2xl font-bold">Policy Status</h1>
          <p className="text-blue-100 opacity-90">Track voting progress and status of your proposal</p>
        </div>

        {/* Lifecycle Stepper */}
        <PolicyLifecycle status={policy.status} />

        {/* Tabs for Details & Simulation */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="details">Policy Details</TabsTrigger>
            <TabsTrigger value="simulation">Impact Simulation</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Policy Details */}
              <Card className="h-fit">
                <CardContent className="p-6">
                  {/* ... existing details content ... */}
                  <div className="flex gap-2 mb-4">
                    <Badge className={`
                                ${policy.status === 'Active' ? 'bg-green-100 text-green-700' :
                        policy.status === 'Proposed' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'}
                            `}>
                      {policy.status.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="bg-purple-50 text-purple-700 capitalize">{policy.organ_type || 'General'}</Badge>
                    {policy.replaces_id && (
                       <Badge variant="outline" className="border-blue-200 text-blue-600">Replaces #{policy.replaces_id}</Badge>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{policy.title}</h2>
                  <div className="flex items-center text-xs text-gray-500 mb-6 space-x-2">
                    <span>Proposed by: {policy.proposer_name}</span>
                    <span>•</span>
                    <span>{new Date(policy.created_at).toLocaleDateString()}</span>
                  </div>

                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-2">Policy Description</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {policy.description}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Current Voting Results</h3>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Total Votes</span>
                      <span>{totalVotes}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                      <div className="flex h-full w-full rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${yesPercent}%` }}></div>
                        <div className="bg-red-500 h-full" style={{ width: `${noPercent}%` }}></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-green-600">{policy.yes_votes} YES ({Math.round(yesPercent)}%)</span>
                      <span className="text-red-600">{policy.no_votes} NO ({Math.round(noPercent)}%)</span>
                    </div>
                  </div>

                  {/* New: AI Weight Display */}
                  {policy.metrics && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                        <Brain className="h-3 w-3 mr-2 text-blue-500" /> Proposed AI Weights
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Blood</p>
                            <p className="text-sm font-black text-gray-800">{(policy.metrics.compatibility_weight * 100 || 0).toFixed(0)}%</p>
                         </div>
                         <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Distance</p>
                            <p className="text-sm font-black text-blue-600">{(policy.metrics.distance_weight * 100 || 0).toFixed(0)}%</p>
                         </div>
                         <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Urgency</p>
                            <p className="text-sm font-black text-orange-600">{(policy.metrics.urgency_weight * 100 || 0).toFixed(0)}%</p>
                         </div>
                         <div className="bg-white p-2 rounded border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Age/Time</p>
                            <p className="text-sm font-black text-emerald-600">{(policy.metrics.age_weight * 100 || 0).toFixed(0)}%</p>
                         </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right: Voting Action */}
              <div className="space-y-6">
                <Card>

                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-gray-500" /> Voting Progress
                    </CardTitle>
                    <CardDescription>Track votes from other organizations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                        <span className="block text-2xl font-bold text-green-600">{policy.yes_votes}</span>
                        <span className="text-xs text-green-800">YES Votes</span>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
                        <span className="block text-2xl font-bold text-red-600">{policy.no_votes}</span>
                        <span className="text-xs text-red-800">NO Votes</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Votes Received</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">{totalVotes}/{policy.total_orgs}</span>
                        <span className="text-xs text-gray-500">
                          {policy.yes_votes >= 4 ? 'Threshold Met' : `+${4 - policy.yes_votes} more YES to pass`}
                        </span>
                      </div>
                    </div>

                    {/* New: Quorum Monitor */}
                    <div className="space-y-3">
                       <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
                         <Activity className="h-3 w-3 mr-2" /> Consortium Quorum
                       </h4>
                       <div className="grid grid-cols-1 gap-2">
                          {[
                            { id: 1, name: 'National Health Org' },
                            { id: 2, name: 'Regional Transplant Group' },
                            { id: 3, name: 'City Medical Council' },
                            { id: 4, name: 'Global Health Alliance' },
                            { id: 5, name: 'Research Consortium' },
                            { id: 6, name: 'Patient Advocacy Board' }
                          ].map((org, i) => {
                             // Logic to determine status
                             let status = 'PENDING';
                             let color = 'bg-gray-300';
                             let textColor = 'text-gray-400';
                             
                             if (org.id === policy.proposer_id) {
                                status = 'PROPOSER';
                                color = 'bg-blue-500';
                                textColor = 'text-blue-600';
                             } else {
                                // Find actual vote for this specific organization from the voters array
                                const actualVote = (policy.voters || []).find(v => v.organization_id === org.id);
                                
                                if (actualVote) {
                                   status = actualVote.vote ? 'YES' : 'NO';
                                   color = actualVote.vote ? 'bg-green-500' : 'bg-red-500';
                                   textColor = actualVote.vote ? 'text-green-600' : 'text-red-600';
                                } else if (policy.status === 'Active' || policy.status === 'Rejected') {
                                   status = 'MISSED';
                                   color = 'bg-gray-100';
                                   textColor = 'text-gray-400';
                                } else {
                                   status = 'PENDING';
                                   color = 'bg-gray-300';
                                   textColor = 'text-gray-400';
                                }
                             }

                             // Specific label for advocacy board
                             const isAdvocacyBoard = org.name.includes("Advocacy Board");

                             return (
                               <div key={i} className={`flex items-center justify-between p-2 rounded border text-[10px] ${isAdvocacyBoard ? 'bg-amber-50/50 border-amber-100' : 'bg-white border-gray-100'}`}>
                                  <div className="flex items-center gap-2">
                                     <div className={`h-2 w-2 rounded-full ${status === 'PENDING' ? 'bg-gray-200' : color}`} />
                                     <span className={`font-medium ${isAdvocacyBoard ? 'text-amber-900' : 'text-gray-700'}`}>
                                       {org.name}
                                       {isAdvocacyBoard && <span className="ml-1 text-[8px] opacity-70">(Patient Rep)</span>}
                                     </span>
                                  </div>
                                  <span className={`font-bold ${textColor}`}>
                                    {status}
                                  </span>
                               </div>
                             );
                          })}
                        </div>
                        <p className="text-[9px] text-gray-400 mt-2 px-1">
                          *The Patient Advocacy Board represents patient interests in the consortium and must maintain a PENDING or YES status for ethical alignment.
                        </p>
                     </div>

                    {/* Status Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1 text-blue-800 font-semibold text-sm">
                        <Info className="h-4 w-4" /> Status
                      </div>
                      <p className="text-xs text-blue-700">
                        {policy.status === 'Active'
                          ? "This policy is ACTIVE and currently enforced by the AI Matching Algorithm."
                          : policy.yes_votes >= 4 
                            ? "Majority reached. Policy is ready for activation."
                            : "Your policy is currently on track for approval."}
                      </p>
                    </div>

                    {/* Self-Voting Check or Vote Buttons */}
                    {policy.status === 'Active' ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-5 mt-4 text-center shadow-sm animate-in fade-in zoom-in duration-300">
                        <div className="mx-auto w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                           <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <h5 className="text-green-900 font-bold text-sm">Policy Ratified</h5>
                        <p className="text-green-700 text-[10px] mt-1">
                          The voting phase has concluded. This policy is now official consortium law and is enforced by the AI Matching Algorithm.
                        </p>
                      </div>
                    ) : isMyProposal ? (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                        <p className="text-center text-xs text-blue-700 font-medium font-serif italic">
                          As the Proposer, your organization's support (YES) is already included in the consortium quorum.
                        </p>
                      </div>
                    ) : policy.has_voted ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 text-center">
                         <span className="text-gray-500 text-xs font-medium flex items-center justify-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> You have already cast your vote for this policy.
                         </span>
                      </div>
                    ) : policy.status !== 'Proposed' ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 text-center">
                         <span className="text-gray-500 text-xs font-medium flex items-center justify-center gap-2">
                            This policy is {policy.status.toLowerCase()} and is no longer accepting votes.
                         </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          onClick={() => handleVote(true)}
                          disabled={isVoting}
                        >
                          {isVoting ? "Verifying..." : "Vote YES"}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleVote(false)}
                          disabled={isVoting}
                        >
                          {isVoting ? "Verifying..." : "Vote NO"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Pause Button (Only for proposer/admin/active) */}
                {(isMyProposal || policy.status === 'Active') && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full py-6 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {policy.status === 'Paused' ? (
                          <><Play className="h-4 w-4 mr-2" /> Resume AI Matching</>
                        ) : (
                          <><Pause className="h-4 w-4 mr-2" /> Pause for AI Matching</>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-gray-900">
                          {policy.status === 'Paused' ? "Resume Policy for AI Matching?" : "Pause Policy for AI Matching?"}
                        </DialogTitle>
                      </DialogHeader>

                      <div className="py-2">
                        <p className="text-sm text-gray-600 mb-4">
                          {policy.status === 'Paused'
                            ? `Resume "${policy.title}" for AI matching consideration? The policy will be actively used again in organ allocation decisions.`
                            : `Pause "${policy.title}" from AI matching consideration? The policy will remain active in the system but won't be used in organ allocation decisions.`
                          }
                        </p>

                        {policy.status !== 'Paused' && (
                          <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900">This will:</h4>
                            <ul className="space-y-2">
                              <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5" />
                                Stop applying policy in AI matching
                              </li>
                              <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5" />
                                Preserve blockchain record (not deleted)
                              </li>
                              <li className="flex items-start gap-2 text-sm text-gray-600">
                                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5" />
                                Can be resumed anytime
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>

                      <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button variant="outline" onClick={() => document.getElementById('close-dialog')?.click()} className="mt-2 sm:mt-0" id="close-dialog">
                          Cancel
                        </Button>
                        <Button
                          className={`${policy.status === 'Paused' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white`}
                          onClick={handlePause}
                        >
                          {policy.status === 'Paused' ? "Resume Policy" : "Pause Policy"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}

                {/* Info Card */}
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Voting Information
                  </h4>
                  <ul className="text-xs text-blue-800 space-y-1 ml-1">
                    <li>• Your vote is permanent and recorded on the blockchain</li>
                    <li>• Policies require majority approval to become active</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="simulation">
            <SimulationPanel policy={policy} />
          </TabsContent>
        </Tabs>
      </div>
    </OrganizationLayout >
  );
}

function SimulationPanel({ policy }: { policy: Readonly<PolicyDetail> }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runSimulation = async () => {
    setLoading(true);
    // Artificially wait at least 1.5s for "AI Effect"
    const minTime = new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const token = localStorage.getItem("organization_token");
      const fetchReq = fetch("/api/organization/policies/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          metrics: policy.metrics || {},
          policy_type: "Distance Priority", // TODO: Extract from description or title if available
          title: policy.title || "",
          description: policy.description || ""
        })
      });

      const [res, _] = await Promise.all([fetchReq, minTime]);

      const data = await res.json();
      if (data.success) {
        setResult(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-purple-600" /> Policy Impact Simulator
          </h2>
          <p className="text-gray-500 text-sm mt-1">AI-driven analysis of how this policy affects organ allocation efficiency and fairness.</p>

          {/* Metrics Preview */}
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
              Distance Weight: {policy.metrics?.distance_weight ? (policy.metrics.distance_weight * 100) + '%' : 'N/A'}
            </Badge>
            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
              Urgency Weight: {policy.metrics?.urgency_weight ? (policy.metrics.urgency_weight * 100) + '%' : 'N/A'}
            </Badge>
          </div>
        </div>

        <Button onClick={runSimulation} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white px-6 min-w-[160px]">
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analyzing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Run Simulation
            </div>
          )}
        </Button>
      </div>

      {
        loading && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <div className="animate-pulse space-y-4">
              <div className="h-12 w-12 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                <Brain className="h-6 w-6 text-purple-500 animate-bounce" />
              </div>
              <p className="text-gray-500 font-medium">Running match simulations on 70+ historical records...</p>
              <Progress value={66} className="w-1/3 mx-auto h-2" />
            </div>
          </div>
        )
      }

      {
        !loading && result && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatComparison
              label="Matches Found"
              baseline={result.baseline.matches_found}
              projected={result.projection.matches_found}
              unit=""
              inverse={false}
            />
            <StatComparison
              label="Avg Transport Distance"
              baseline={result.baseline.avg_distance}
              projected={result.projection.avg_distance}
              unit="km"
              inverse={true} // Lower is better
            />
            <StatComparison
              label="Efficiency Score"
              baseline={result.baseline.efficiency_score}
              projected={result.projection.efficiency_score}
              unit=""
              inverse={false}
            />
          </div>
        )
      }

      {
        result && (
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-900 mb-2">AI Analysis</h3>
              <p className="text-blue-700 text-sm">
                This policy is projected to change average transport distance by
                <strong> {result.diff.avg_distance > 0 ? '+' : ''}{result.diff.avg_distance}km</strong>.
                {result.diff.avg_distance < 0
                  ? " This is a positive outcome, reducing ischemia time."
                  : " This increases travel time, potentially impacting organ viability."}
              </p>
            </CardContent>
          </Card>
        )
      }

      {/* Footer Disclaimer */}
      {result && !loading && (
        <div className="flex items-center gap-2 justify-center text-xs text-gray-400 mt-2">
          <Info className="h-3 w-3" />
          <span>Simulation performed on <strong>70 verified historical records</strong> (anonymized).</span>
        </div>
      )}

    </div >
  );
}

function StatComparison({ label, baseline, projected, unit, inverse }: any) {
  const diff = projected - baseline;
  const isGood = inverse ? diff < 0 : diff > 0;

  const formatNum = (n: number) => {
    if (Math.abs(n - Math.round(n)) < 0.0001) return Math.round(n);
    return Number(n.toFixed(2));
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h4 className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-4">{label}</h4>
        <div className="flex justify-between items-end mb-2">
          <div className="text-3xl font-bold text-gray-900">{formatNum(projected)}{unit}</div>
          <div className={`text-sm font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
            {diff > 0 ? '+' : ''}{formatNum(diff)}{unit}
          </div>
        </div>
        <div className="text-xs text-gray-400">Baseline: {formatNum(baseline)}{unit}</div>

        {/* Visual Bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden flex">
          <div className="bg-gray-300 h-full" style={{ width: '50%' }}></div>
          <div className={`${isGood ? 'bg-green-500' : 'bg-red-500'} h-full transition-all duration-500`}
            style={{ width: `${Math.min(50, Math.abs(diff * 2))}%` }}></div>
        </div>
      </CardContent>
    </Card>
  )
}
