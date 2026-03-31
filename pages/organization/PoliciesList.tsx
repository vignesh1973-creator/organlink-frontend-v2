
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import OrganizationLayout from "../../components/organization/OrganizationLayout";
import { useEffect, useState, useMemo } from "react";
import { Search, Filter, BookOpen, User, Eye, Activity } from "lucide-react";

interface Policy {
  id: number;
  title: string;
  description: string;
  status: 'Proposed' | 'Active' | 'Paused' | 'Rejected' | 'Archived';
  yes_votes: number;
  no_votes: number;
  proposer_name: string;
  proposer_id: number;
  created_at: string;
  has_voted: boolean;
  organ_type?: string;
  policy_type?: string;
}

export default function PoliciesList() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserOrgId, setCurrentUserOrgId] = useState<number | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [organFilter, setOrganFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const token = localStorage.getItem("organization_token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserOrgId(payload.organization_id);
      } catch (e) {
        console.error("Failed to decode token", e);
      }
    }

    const fetchPolicies = async () => {
      try {
        const res = await fetch("/api/organization/policies", {
          headers: { Authorization: `Bearer ${token || ''}` }
        });
        const data = await res.json();
        if (data.success) {
          setPolicies(data.policies);
        }
      } catch (error) {
        console.error("Failed to fetch policies:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const getFilteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      // Search term filter
      const matchesSearch = policy.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           policy.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" || policy.status.toLowerCase() === statusFilter.toLowerCase();
      
      // Organ filter
      const matchesOrgan = organFilter === "all" || (policy.organ_type || "").toLowerCase() === organFilter.toLowerCase();
      
      // Tab filter
      const matchesTab = activeTab === "all" || 
                        (activeTab === "mine" && policy.proposer_id === currentUserOrgId) ||
                        (activeTab === "others" && policy.proposer_id !== currentUserOrgId);
      
      return matchesSearch && matchesStatus && matchesOrgan && matchesTab;
    });
  }, [policies, searchTerm, statusFilter, organFilter, activeTab, currentUserOrgId]);

  const PolicyCard = ({ policy }: { policy: Policy }) => {
    const yes = typeof policy.yes_votes === 'string' ? parseInt(policy.yes_votes) : policy.yes_votes;
    const no = typeof policy.no_votes === 'string' ? parseInt(policy.no_votes) : policy.no_votes;
    const totalOrgs = 6;
    const isMyProposal = currentUserOrgId === policy.proposer_id;

    return (
      <Card className="mb-4 hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-2">
            <div className="flex gap-2 mb-2">
              <Badge className={
                policy.status === 'Active' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                  policy.status === 'Proposed' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                    'bg-gray-100 text-gray-700 hover:bg-gray-100'
              }>
                {policy.status.toUpperCase()}
              </Badge>
              {policy.organ_type && (
                <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-50 capitalize">
                  {policy.organ_type}
                </Badge>
              )}
              {isMyProposal && (
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">My Proposal</Badge>
              )}
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-gray-900">{Math.round((yes / 6) * 100)}%</span>
              <p className="text-xs text-gray-500">Consensus</p>
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mb-2">{policy.title}</h3>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {policy.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {policy.proposer_name}
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-px bg-gray-300 mx-1"></div>
              #{policy.id}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-gray-700">Consortium Progress</span>
              <span className="text-gray-500">{yes}/6 Received</span> 
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${policy.status === 'Active' ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${(yes / 6) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 pt-4 border-t border-gray-100">
            <span>Created {formatDate(policy.created_at)}</span>
            <a href={`/organization/policies/vote/${policy.id}`}>
              <Button variant="outline" size="sm" className="h-8 shadow-sm text-blue-600 border-blue-100 hover:bg-blue-50">
                <Eye className="h-3 w-3 mr-1" /> View Details
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <OrganizationLayout>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-blue-600 rounded-xl p-8 text-white relative overflow-hidden shadow-lg">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold mb-2">Policy Governance Portal</h1>
            <p className="text-blue-100 opacity-90 max-w-md">Real-time monitoring of organ allocation mandates and consortium voting status.</p>
          </div>
          <Activity className="absolute -right-8 -bottom-8 h-48 w-48 text-white opacity-5 rotate-12" />
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search by title or description..." 
              className="pl-10 border-gray-200 focus:ring-blue-500" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="proposed">Proposed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={organFilter} onValueChange={setOrganFilter}>
              <SelectTrigger className="w-[120px] bg-gray-50 border-gray-200">
                <SelectValue placeholder="All Organs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organs</SelectItem>
                <SelectItem value="kidney">Kidney</SelectItem>
                <SelectItem value="heart">Heart</SelectItem>
                <SelectItem value="liver">Liver</SelectItem>
                <SelectItem value="lung">Lung</SelectItem>
              </SelectContent>
            </Select>
            <Button 
                variant="outline" 
                size="icon"
                className="bg-gray-50 border-gray-200"
                onClick={() => {setSearchTerm(""); setStatusFilter("all"); setOrganFilter("all");}}
                title="Reset Filters"
            >
              <Filter className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        </div>

        {/* Tabs & List */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="bg-white rounded-t-xl border-b px-4">
            <TabsList className="bg-transparent h-12 w-full justify-start gap-8 p-0">
              <TabsTrigger value="all" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0 font-semibold text-gray-500 data-[state=active]:text-blue-600">
                All Policies
              </TabsTrigger>
              <TabsTrigger value="mine" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0 font-semibold text-gray-500 data-[state=active]:text-blue-600">
                My Proposals
              </TabsTrigger>
              <TabsTrigger value="others" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0 font-semibold text-gray-500 data-[state=active]:text-blue-600">
                Others' Policies
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-6">
            <TabsContent value={activeTab} className="space-y-4 m-0 min-h-[400px]">
              {loading ? (
                <div className="grid grid-cols-1 gap-4">
                  {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-gray-50 border-gray-100" />)}
                </div>
              ) : getFilteredPolicies.length > 0 ? (
                getFilteredPolicies.map(policy => <PolicyCard key={policy.id} policy={policy} />)
              ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                  <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">No policies found</h3>
                  <p className="text-gray-500 mt-1">Try adjusting your search or filters to find what you're looking for.</p>
                  <Button variant="link" className="text-blue-600 mt-4" onClick={() => {setSearchTerm(""); setStatusFilter("all"); setOrganFilter("all"); setActiveTab("all");}}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </OrganizationLayout>
  );
}

