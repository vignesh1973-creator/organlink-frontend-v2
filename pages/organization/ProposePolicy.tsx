import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrganizationLayout from "@/components/organization/OrganizationLayout";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Badge } from "../../components/ui/badge";
import { Slider } from "../../components/ui/slider";
import { useToast } from "../../hooks/use-toast";
import { ProposeSkeleton } from "../../components/ui/skeletons";
import { TrendingUp, FileText, Heart, Info } from "lucide-react";

interface ActivePolicy {
  id: number;
  title: string;
  organ_type: string;
}

export default function ProposePolicy() {
  const [title, setTitle] = useState("");
  const [organType, setOrganType] = useState("");
  const [policyType, setPolicyType] = useState("");
  const [votingDuration, setVotingDuration] = useState("7");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading form data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const [geographicScope, setGeographicScope] = useState("");
  const [description, setDescription] = useState("");
  const [problemSolved, setProblemSolved] = useState("");
  const [expectedImpact, setExpectedImpact] = useState("");
  const [implementationPlan, setImplementationPlan] = useState("");
  const [parameters, setParameters] = useState("");
  const [targetDemo, setTargetDemo] = useState("");
  const [references, setReferences] = useState("");
  const [supportingData, setSupportingData] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tx, setTx] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<number | null>(null);
  const [activePolicies, setActivePolicies] = useState<ActivePolicy[]>([]);
  const [replacesPolicyId, setReplacesPolicyId] = useState<string>("none");

  // AI Weight States (Total should aim for 1.0)
  const [weights, setWeights] = useState({
    compatibility: 40,
    urgency: 30,
    distance: 20,
    age: 10
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchActivePolicies();
  }, []);

  const fetchActivePolicies = async () => {
    try {
      const token = localStorage.getItem("organization_token");
      const res = await fetch("/api/organization/policies", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Filter for active policies only
        setActivePolicies(data.policies.filter((p: any) => p.status === 'Active'));
      }
    } catch (err) {
      console.error("Failed to fetch active policies:", err);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("organization_token");
      const res = await fetch("/api/organization/policies/propose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          organ_type: organType,
          policy_type: policyType,
          replaces_id: replacesPolicyId === "none" ? null : parseInt(replacesPolicyId),
          metrics: {
            compatibility_weight: weights.compatibility / 100,
            urgency_weight: weights.urgency / 100,
            distance_weight: weights.distance / 100,
            age_weight: weights.age / 100
          }
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");

      setProposalId(data.policyId);
      // Removed tx hash expectation for offline proposal

      toast({
        title: "✅ Policy Submitted for Voting!",
        description: `Your policy "${title}" has been created. It requires >50% votes to be activated.`,
        variant: "default",
      });

      // Redirect to policies page after 2 seconds
      setTimeout(() => {
        window.location.href = "/organization/policies";
      }, 2000);
    } catch (e: any) {
      toast({
        title: "❌ Proposal Failed",
        description: e.message || "Failed to propose policy",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OrganizationLayout>
      {isLoading ? (
        <ProposeSkeleton />
      ) : (
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-blue-600 rounded-2xl px-4 md:px-8 py-6 text-white">
            <h1 className="text-2xl font-bold mb-2">Propose New Policy</h1>
            <p className="text-blue-100">Create a new organ allocation policy for global collaboration</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Basic Information */}
            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-green-600">📋 Basic Information</CardTitle>
                </div>
                <p className="text-sm text-gray-600">Fundamental details about your policy proposal</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                      Policy Title *
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Cross-Border Organ Sharing Protocol"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="organType" className="text-sm font-medium text-gray-700">
                      Organ Type *
                    </Label>
                    <Select value={organType} onValueChange={setOrganType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select organ type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kidney">Kidney</SelectItem>
                        <SelectItem value="liver">Liver</SelectItem>
                        <SelectItem value="heart">Heart</SelectItem>
                        <SelectItem value="lung">Lung</SelectItem>
                        <SelectItem value="all">All Organs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="policyType" className="text-sm font-medium text-gray-700">
                      Policy Type *
                    </Label>
                    <Select value={policyType} onValueChange={setPolicyType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select policy type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allocation">Allocation Priority</SelectItem>
                        <SelectItem value="matching">Matching Algorithm</SelectItem>
                        <SelectItem value="geographic">Geographic Distribution</SelectItem>
                        <SelectItem value="emergency">Emergency Protocol</SelectItem>
                        <SelectItem value="pediatric">Pediatric Policy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="votingDuration" className="text-sm font-medium text-gray-700">
                      Voting Duration (days)
                    </Label>
                    <Select value={votingDuration} onValueChange={setVotingDuration}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="7 days (recommended)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days (recommended)</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="geographicScope" className="text-sm font-medium text-gray-700">
                      Geographic Scope
                    </Label>
                    <Select value={geographicScope} onValueChange={setGeographicScope}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local Region</SelectItem>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="international">International</SelectItem>
                        <SelectItem value="global">Global</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="replacesPolicy" className="text-sm font-medium text-gray-700 text-blue-600 font-bold">
                      🔄 Replaces Existing Policy? (Superseding)
                    </Label>
                    <Select value={replacesPolicyId} onValueChange={setReplacesPolicyId}>
                      <SelectTrigger className="mt-1 border-blue-200 bg-blue-50">
                        <SelectValue placeholder="Select policy to replace (None)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">New Draft (None)</SelectItem>
                        {activePolicies.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.title} ({p.organ_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Policy Description */}
            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-600">✅ Policy Description</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a detailed description of the policy..."
                    rows={4}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="problemSolved" className="text-sm font-medium text-gray-700">
                    Problem Solved *
                  </Label>
                  <Textarea
                    id="problemSolved"
                    value={problemSolved}
                    onChange={(e) => setProblemSolved(e.target.value)}
                    placeholder="What specific problem does this policy address?"
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="expectedImpact" className="text-sm font-medium text-gray-700">
                    Expected Impact *
                  </Label>
                  <Textarea
                    id="expectedImpact"
                    value={expectedImpact}
                    onChange={(e) => setExpectedImpact(e.target.value)}
                    placeholder="What positive outcomes do you expect from this policy?"
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="implementationPlan" className="text-sm font-medium text-gray-700">
                    Implementation Plan
                  </Label>
                  <Textarea
                    id="implementationPlan"
                    value={implementationPlan}
                    onChange={(e) => setImplementationPlan(e.target.value)}
                    placeholder="How should this policy be implemented?"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Technical & Supporting Details */}
            <Card className="border border-gray-200">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Info className="h-5 w-5 text-red-600" />
                  <CardTitle className="text-red-600">❤️ Technical & Supporting Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
            {/* AI Policy Parameters - Sliders */}
            <Card className="border-2 border-blue-200 bg-blue-50/30 shadow-sm">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-700">⚙️ AI Matching Algorithm Weights</CardTitle>
                </div>
                <p className="text-xs text-blue-600 font-medium">Configure how the AI prioritizes matching. Total must equal 100%.</p>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold text-gray-700">🩸 Blood Compatibility</Label>
                    <Badge variant="outline" className="bg-white">{weights.compatibility}%</Badge>
                  </div>
                  <Slider 
                    value={[weights.compatibility]} 
                    onValueChange={(val) => setWeights({...weights, compatibility: val[0]})} 
                    max={100} step={5} 
                    className="py-4"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold text-gray-700">🚨 Urgency Priority</Label>
                    <Badge variant="outline" className="bg-white">{weights.urgency}%</Badge>
                  </div>
                  <Slider 
                    value={[weights.urgency]} 
                    onValueChange={(val) => setWeights({...weights, urgency: val[0]})} 
                    max={100} step={5} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold text-gray-700">📍 Geographic Proximity</Label>
                    <Badge variant="outline" className="bg-white">{weights.distance}%</Badge>
                  </div>
                  <Slider 
                    value={[weights.distance]} 
                    onValueChange={(val) => setWeights({...weights, distance: val[0]})} 
                    max={100} step={5} 
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-bold text-gray-700">⏱️ Time / Age Factor</Label>
                    <Badge variant="outline" className="bg-white">{weights.age}%</Badge>
                  </div>
                  <Slider 
                    value={[weights.age]} 
                    onValueChange={(val) => setWeights({...weights, age: val[0]})} 
                    max={100} step={5} 
                  />
                </div>

                <div className={`p-3 rounded-lg flex items-center justify-between ${
                  (weights.compatibility + weights.urgency + weights.distance + weights.age) === 100 
                  ? "bg-green-100 border border-green-200 text-green-800"
                  : "bg-orange-100 border border-orange-200 text-orange-800"
                }`}>
                  <span className="text-sm font-bold">Total Weight Balance:</span>
                  <span className="text-lg font-black">{weights.compatibility + weights.urgency + weights.distance + weights.age}%</span>
                </div>
              </CardContent>
            </Card>

                <div>
                  <Label htmlFor="targetDemo" className="text-sm font-medium text-gray-700">
                    Target Demographic
                  </Label>
                  <Textarea
                    id="targetDemo"
                    value={targetDemo}
                    onChange={(e) => setTargetDemo(e.target.value)}
                    placeholder="e.g., Pediatric patients, Adults over 65"
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="references" className="text-sm font-medium text-gray-700">
                    References & Sources
                  </Label>
                  <Textarea
                    id="references"
                    value={references}
                    onChange={(e) => setReferences(e.target.value)}
                    placeholder="Include any research papers, guidelines, or sources that support this policy"
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="supportingData" className="text-sm font-medium text-gray-700">
                    Supporting Data
                  </Label>
                  <Textarea
                    id="supportingData"
                    value={supportingData}
                    onChange={(e) => setSupportingData(e.target.value)}
                    placeholder="Any statistical data or evidence supporting this policy"
                    rows={3}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Proposal Guidelines */}
            <Card className="bg-blue-50 border border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Proposal Guidelines</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• All policy proposals are automatically submitted as "APPROVED" for voting</li>
                      <li>• Policies require ≥ 50% approval votes to become "ACTIVE"</li>
                      <li>• Active policies automatically influence AI matching algorithms</li>
                      <li>• Proposals are recorded on Ethereum blockchain for transparency</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Section */}
            <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4">
              <Button variant="outline" size="lg" className="w-full md:w-auto">
                Cancel
              </Button>
              <Button
                disabled={submitting || !title || !description}
                onClick={submit}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
              >
                {submitting ? "Submitting..." : "Submit Policy Proposal"}
              </Button>
            </div>

            {/* Success Message */}
            {tx && (
              <Card className="bg-green-50 border border-green-200">
                <CardContent className="p-6">
                  <div className="text-sm text-green-700">
                    <p className="font-medium mb-2">✅ Policy proposal submitted successfully!</p>
                    <p className="mb-2">
                      <span className="font-medium">Transaction Hash: </span>
                      <a
                        className="underline hover:text-green-800"
                        target="_blank"
                        href={`https://sepolia.etherscan.io/tx/${tx}`}
                      >
                        {tx}
                      </a>
                    </p>
                    {proposalId !== null && (
                      <p><span className="font-medium">Proposal ID: </span>#{proposalId}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </OrganizationLayout>
  );
}
