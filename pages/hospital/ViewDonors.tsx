import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Heart,
  Plus,
  Search,
  Filter,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  Eye,
  ExternalLink,
  UserCheck,
  Trash2,
  Copy,
  Check, // Add Check icon
  Download,
  Pencil,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { useHospitalAuth } from "@/contexts/HospitalAuthContext";
import { useToast } from "@/contexts/ToastContext";
import HospitalLayout from "@/components/hospital/HospitalLayout";
import EditDonorModal from "@/components/hospital/EditDonorModal";
import { Skeleton } from "@/components/ui/skeleton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface Donor {
  id: number;
  donor_id: string;
  hospital_id: string;
  status: string; // 'Available', 'In Progress', 'Matched', 'Completed', 'Donated'
  full_name: string;
  age: number;
  gender: string;
  blood_type: string;
  organs_to_donate: string[];
  medical_history: string;
  contact_phone: string;
  contact_email: string;
  emergency_contact: string;
  emergency_phone: string;
  signature_file_path?: string;
  signature_ipfs_hash?: string;
  blockchain_hash?: string;
  signature_verified: boolean;
  registration_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  hospital_display_id?: number;
  organlink_id?: string;
  last_check_in?: string;
  living_status?: string;
  condition_reason?: string;
}

export default function ViewDonors() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [filteredDonors, setFilteredDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrgan, setFilterOrgan] = useState("all");
  const [filterBloodType, setFilterBloodType] = useState("all");
  const [filterActivity, setFilterActivity] = useState("all");
  const [filterLivingStatus, setFilterLivingStatus] = useState("all");
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewDonor, setViewDonor] = useState<Donor | null>(null);
  const [deletingDonor, setDeletingDonor] = useState<string | null>(null);
  const [confirmDeleteDonor, setConfirmDeleteDonor] = useState<Donor | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedVerifyId, setCopiedVerifyId] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportFields, setExportFields] = useState({
    donorId: true,
    name: true,
    age: true,
    gender: true,
    bloodType: true,
    organs: true,
    contact: true,
    status: true,
    registrationDate: true,
    verified: true,
    txHash: true
  });

  // Global Lookup State
  const [isGlobalLookupOpen, setIsGlobalLookupOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupForm, setLookupForm] = useState({
    full_name: "",
    organlink_id: "",
    govt_id_number: "",
    blood_type: "all"
  });

  const handleGlobalLookup = async () => {
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const token = localStorage.getItem("hospital_token");
      const response = await fetch("/api/hospital/donors/global-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(lookupForm)
      });

      const data = await response.json();
      if (data.success && data.found) {
        setLookupResult(data.data);
      } else {
        showError(data.message || "No record found.");
      }
    } catch (err) {
      showError("Lookup failed. Please check network.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleImportDonor = async () => {
    if (!lookupResult || isImporting) return;
    setIsImporting(true);
    try {
      const token = localStorage.getItem("hospital_token");
      const payload = {
        full_name: lookupResult.full_name || "Unknown",
        age: lookupResult.age || 0,
        gender: lookupResult.gender || "Other",
        blood_type: lookupResult.blood_type || "A+",
        organs_to_donate: lookupResult.organs_to_donate || [],
        medical_history: lookupResult.original_hospital_name 
          ? `${lookupResult.medical_history || "Healthy"} | Transferred from ${lookupResult.original_hospital_name}, ${lookupResult.hospital_city || "Unknown"}`
          : (lookupResult.medical_history || "Imported Record"),
        contact_phone: lookupResult.contact_phone || "N/A",
        contact_email: lookupResult.contact_email || "",
        guardian_name: lookupResult.guardian_name || "",
        guardian_phone: lookupResult.guardian_phone || "",
        govt_id_type: lookupResult.govt_id_type || "Custom",
        govt_id_number: lookupResult.govt_id_number || `IMPORT-${Date.now()}`,
        organlink_id: lookupResult.organlink_id,
        existing_ipfs_hash: lookupResult.signature_ipfs_hash,
        existing_blockchain_hash: lookupResult.blockchain_hash,
        existing_ocr_confidence: lookupResult.ocr_confidence != null ? lookupResult.ocr_confidence : 100
      };

      const response = await fetch("/api/hospital/donors/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        showSuccess("Donor imported successfully!");
        setIsGlobalLookupOpen(false);
        fetchDonors(); // Refresh list
      } else {
        const errorMsg = result.error || "Failed to import donor.";
        showError(errorMsg);
        alert(`IMPORT FAILED: ${errorMsg}`);
      }
    } catch (e: any) {
      console.error("Import error:", e);
      showError("Import failed. Check connection.");
      alert(`IMPORT EXCEPTION: ${e?.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleExportField = (field: keyof typeof exportFields) => {
    setExportFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const { hospital } = useHospitalAuth();
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    fetchDonors();
  }, []);

  useEffect(() => {
    filterDonors();
  }, [donors, searchTerm, filterOrgan, filterBloodType, filterActivity, filterLivingStatus]);

  const fetchDonors = async () => {
    try {
      const token = localStorage.getItem("hospital_token");
      const response = await fetch("/api/hospital/donors", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDonors(data.donors);
      } else {
        showError("Failed to load donors");
      }
    } catch (error) {
      console.error("Failed to fetch donors:", error);
      showError("Failed to load donors");
    } finally {
      setLoading(false);
    }
  };

  const filterDonors = () => {
    let filtered = donors;

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (donor) =>
          donor.full_name.toLowerCase().includes(lowerSearch) ||
          String(donor.donor_id).toLowerCase().includes(lowerSearch) ||
          (donor.organlink_id && donor.organlink_id.toLowerCase().includes(lowerSearch)) ||
          donor.contact_email.toLowerCase().includes(lowerSearch),
      );
    }

    // Organ filter
    if (filterOrgan && filterOrgan !== "all") {
      filtered = filtered.filter((donor) =>
        donor.organs_to_donate.includes(filterOrgan),
      );
    }

    // Blood type filter
    if (filterBloodType && filterBloodType !== "all") {
      filtered = filtered.filter(
        (donor) => donor.blood_type === filterBloodType,
      );
    }

    // Activity status filter
    if (filterActivity && filterActivity !== "all") {
      filtered = filtered.filter((donor) => {
        const status = getActivityStatus(donor.last_check_in);
        return status.category === filterActivity;
      });
    }

    // Living status filter
    if (filterLivingStatus && filterLivingStatus !== "all") {
      filtered = filtered.filter((donor) => 
        (donor.living_status || 'Living') === filterLivingStatus
      );
    }

    setFilteredDonors(filtered);
  };

  const getActivityStatus = (lastCheckIn?: string) => {
    if (!lastCheckIn) return { label: "Unknown", color: "bg-gray-100 text-gray-700 font-medium", category: "active" };
    
    // For demo purposes, we parse the date string reliably
    const checkDate = new Date(lastCheckIn).getTime();
    if (isNaN(checkDate)) return { label: "Format Error", color: "bg-gray-100 text-gray-700 font-medium", category: "active" };
    
    const diffMs = Date.now() - checkDate;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (days < 30) return { label: `Active (Verified ${days}d ago)`, color: "bg-green-100 text-green-700 font-semibold", category: "active" };
    if (days < 60) return { label: `Action Required (${days}d ago)`, color: "bg-amber-100 text-amber-700 font-semibold border border-amber-200", category: "action" };
    return { label: `Inactive (${days}d ago - Reverify!)`, color: "bg-red-100 text-red-700 font-bold border border-red-200", category: "inactive" };
  };

  const handleCheckIn = async (donorId: number | string) => {
    try {
      const token = localStorage.getItem("hospital_token");
      const response = await fetch(`/api/hospital/donors/${donorId}/check-in`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        showSuccess("Activity verification successful!");
        fetchDonors();
      }
    } catch (e) {
      showError("Check-in failed");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const organTypes = [
    "Kidney",
    "Liver",
    "Heart",
    "Lung",
    "Pancreas",
    "Cornea",
    "Bone Marrow",
    "Skin",
    "Bone",
  ];
  const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

  const handleEditDonor = (donor: Donor) => {
    setEditingDonor(donor);
    setIsEditModalOpen(true);
  };

  const handleDonorUpdate = (updatedDonor: Donor) => {
    setDonors((prev) =>
      prev.map((d) =>
        d.donor_id === updatedDonor.donor_id ? updatedDonor : d,
      ),
    );
    setFilteredDonors((prev) =>
      prev.map((d) =>
        d.donor_id === updatedDonor.donor_id ? updatedDonor : d,
      ),
    );
  };

  const openDeleteConfirm = (donor: Donor) => {
    setConfirmDeleteDonor(donor);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteDonor) return;
    await handleDeleteDonor(confirmDeleteDonor.donor_id);
    setConfirmDeleteDonor(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingDonor(null);
  };

  const handleDeleteDonor = async (donorId: string) => {
    setDeletingDonor(donorId);
    try {
      const token = localStorage.getItem("hospital_token");
      const response = await fetch(`/api/hospital/donors/${donorId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        showSuccess("Donor deleted successfully!");
        // Remove from local state
        setDonors((prev) => prev.filter((d) => d.donor_id !== donorId));
        setFilteredDonors((prev) => prev.filter((d) => d.donor_id !== donorId));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Delete error:", error);
      showError("Failed to delete donor");
    } finally {
      setDeletingDonor(null);
    }
  };

  if (loading) {
    return (
      <HospitalLayout title="Donor Management" subtitle="Manage and track organ donors">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </HospitalLayout>
    );
  }

  return (
    <HospitalLayout
      title="Donor Management"
      subtitle="View and manage registered donors"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-4"></div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              {/* GLOBAL LOOKUP BUTTON */}
              <Button
                variant="outline"
                className="w-full sm:w-auto border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                onClick={() => setIsGlobalLookupOpen(true)}
              >
                <Search className="h-4 w-4 mr-2" />
                Global Search
              </Button>

              <Button
                variant="outline"
                onClick={() => setExportOpen(true)}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Link to="/hospital/donors/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto bg-medical-600 hover:bg-medical-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Register New Donor
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Donors</p>
                  <p className="text-2xl font-bold">{donors.length}</p>
                </div>
                <Heart className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Donors</p>
                  <p className="text-2xl font-bold">
                    {donors.filter((d) => d.is_active).length}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-2xl font-bold">
                    {donors.filter((d) => d.signature_verified).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Organs</p>
                  <p className="text-2xl font-bold">
                    {donors.reduce(
                      (total, donor) => total + donor.organs_to_donate.length,
                      0,
                    )}
                  </p>
                </div>
                <Heart className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="relative xl:col-span-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search donors..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterOrgan} onValueChange={setFilterOrgan}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by organ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organs</SelectItem>
                  {organTypes.map((organ) => (
                    <SelectItem key={organ} value={organ}>
                      {organ}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterBloodType}
                onValueChange={setFilterBloodType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by blood type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Blood Types</SelectItem>
                  {bloodTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filterActivity}
                onValueChange={setFilterActivity}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Activity Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active (Verified)</SelectItem>
                  <SelectItem value="action">Action Required</SelectItem>
                  <SelectItem value="inactive">Inactive (Stale)</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterLivingStatus}
                onValueChange={setFilterLivingStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Living Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Donors</SelectItem>
                  <SelectItem value="Living">Living</SelectItem>
                  <SelectItem value="Deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setFilterOrgan("all");
                  setFilterBloodType("all");
                  setFilterActivity("all");
                  setFilterLivingStatus("all");
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Donors List */}
        {/* Tabs for Active vs History */}
        <Tabs defaultValue="active" className="w-full space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Donors ({filteredDonors.filter(d => !['Completed', 'Donated'].includes(d.status)).length})</TabsTrigger>
            <TabsTrigger value="history">Donation History ({filteredDonors.filter(d => ['Completed', 'Donated'].includes(d.status)).length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {filteredDonors.filter(d => !['Completed', 'Donated'].includes(d.status)).length > 0 ? (
              filteredDonors.filter(d => !['Completed', 'Donated'].includes(d.status)).map((donor) => (
                <Card key={donor.donor_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{donor.full_name}</h3>
                            <p className="text-sm text-gray-500">
                              ID: {donor.hospital_display_id ? `#${donor.hospital_display_id}` : donor.donor_id} • Age: {donor.age} • {donor.gender} • {donor.living_status || 'Living'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getActivityStatus(donor.last_check_in).color}>
                              {getActivityStatus(donor.last_check_in).label}
                            </Badge>
                            <Badge variant="outline">{donor.blood_type}</Badge>
                            {donor.signature_verified && <Badge className="bg-green-50 text-green-700 border-green-200"><ShieldCheck className="h-3 w-3 mr-1" />Verified</Badge>}
                            {donor.status === 'Matched' && <Badge className="bg-purple-100 text-purple-800">Matched</Badge>}
                            {(!donor.status || donor.status === 'Available') && <Badge className="bg-blue-100 text-blue-800 font-medium">Available</Badge>}
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Organs to Donate:</p>
                          <div className="flex flex-wrap gap-2">
                            {donor.organs_to_donate.map((organ) => (
                              <Badge key={organ} className="bg-red-50 text-red-700 border-red-100"><Heart className="h-3 w-3 mr-1" />{organ}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center text-gray-600"><Phone className="h-4 w-4 mr-2" />{donor.contact_phone}</div>
                          {donor.contact_email && <div className="flex items-center text-gray-600"><Mail className="h-4 w-4 mr-2" />{donor.contact_email}</div>}
                          <div className="flex items-center text-gray-600"><Calendar className="h-4 w-4 mr-2" />Registered: {formatDate(donor.registration_date)}</div>
                        </div>

                        <div className="mt-3 text-sm text-gray-600">
                          {donor.medical_history && <p><strong>Medical History:</strong> {donor.medical_history}</p>}
                          <p className="mt-1"><strong>Emergency Contact:</strong> {donor.emergency_contact} - {donor.emergency_phone}</p>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2 md:space-y-2 md:ml-6">
                        <Button variant="outline" size="sm" onClick={() => setViewDonor(donor)} title="View details"><Eye className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => handleEditDonor(donor)} title="Edit donor"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => openDeleteConfirm(donor)} disabled={deletingDonor === donor.donor_id} className="text-red-600 hover:text-red-700 hover:border-red-300" title="Delete donor"><Trash2 className="h-4 w-4" /></Button>
                        {donor.blockchain_hash && (
                          <Button variant="outline" size="sm"
                            disabled={!(donor.blockchain_hash.startsWith("0x") && donor.blockchain_hash.length === 66)}
                            onClick={() => donor.blockchain_hash && window.open(`https://sepolia.etherscan.io/tx/${donor.blockchain_hash}`, "_blank")}
                            title={donor.blockchain_hash.startsWith("0x") ? "View on Etherscan" : "Demo TX"}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Active Donors</h3>
                <p className="text-gray-500">No donors are currently available or in progress.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {filteredDonors.filter(d => ['Completed', 'Donated'].includes(d.status)).length > 0 ? (
              filteredDonors.filter(d => ['Completed', 'Donated'].includes(d.status)).map((donor) => (
                <Card key={donor.donor_id} className="opacity-90 bg-gray-50">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{donor.full_name}</h3>
                            <p className="text-sm text-gray-500">
                              ID: {donor.hospital_display_id ? `#${donor.hospital_display_id}` : donor.donor_id} • Age: {donor.age} • {donor.gender} • {donor.living_status || 'Living'}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Badge variant="outline">{donor.blood_type}</Badge>
                            <Badge className="bg-green-600 text-white"><CheckCircle className="h-3 w-3 mr-1" />Donated</Badge>
                            <Badge variant="secondary">Archived</Badge>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Organs Donated:</p>
                          <div className="flex flex-wrap gap-2">
                            {donor.organs_to_donate.map((organ) => (
                              <Badge key={organ} className="bg-gray-200 text-gray-700"><Heart className="h-3 w-3 mr-1" />{organ}</Badge>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                          <div className="flex items-center"><Phone className="h-4 w-4 mr-2" />{donor.contact_phone}</div>
                          {donor.contact_email && <div className="flex items-center"><Mail className="h-4 w-4 mr-2" />{donor.contact_email}</div>}
                          <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" />Registered: {formatDate(donor.registration_date)}</div>
                        </div>
                      </div>

                      <div className="flex md:flex-col gap-2 md:space-y-2 md:ml-6">
                        {/* ONLY View Actions, No Edit/Delete */}
                        <Button variant="outline" size="sm" onClick={() => setViewDonor(donor)} title="View details"><Eye className="h-4 w-4" /></Button>

                        {donor.blockchain_hash && (
                          <Button variant="outline" size="sm"
                            disabled={!(donor.blockchain_hash.startsWith("0x") && donor.blockchain_hash.length === 66)}
                            onClick={() => donor.blockchain_hash && window.open(`https://sepolia.etherscan.io/tx/${donor.blockchain_hash}`, "_blank")}
                            title="View on Etherscan"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Donation History</h3>
                <p className="text-gray-500">No completed donations found in archives.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EditDonorModal
        donor={editingDonor}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onUpdate={handleDonorUpdate}
      />

      {
        viewDonor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Donor Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewDonor(null)}
                >
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">
                    Personal Information
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-gray-600 font-bold text-blue-800">
                      ID: {viewDonor.organlink_id || "N/A"}
                    </p>
                    {viewDonor.organlink_id && (
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 ml-2"
                          onClick={() => {
                            if (viewDonor.organlink_id) {
                              navigator.clipboard.writeText(viewDonor.organlink_id);
                              setCopiedId(viewDonor.organlink_id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }
                          }}
                          title="Copy OrganLink ID"
                        >
                          {copiedId === viewDonor.organlink_id ? (
                            <>
                              <Check className="h-4 w-4 text-green-600 mr-1" />
                              <span className="text-xs text-green-600 font-medium">Copied!</span>
                            </>
                          ) : (
                            <Copy className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 mt-1">{viewDonor.full_name}</p>
                  <p className="text-gray-600">
                    {viewDonor.age} years • {viewDonor.gender} • {viewDonor.living_status || 'Living'} ({viewDonor.condition_reason || (viewDonor.living_status === 'Deceased' ? 'Unknown' : 'Voluntary/Altruistic')})
                  </p>
                  <p className="text-gray-600">
                    Blood Type: {viewDonor.blood_type}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Contact</p>
                  <p className="text-gray-600 mt-1">{viewDonor.contact_phone}</p>
                  {viewDonor.contact_email && (
                    <p className="text-gray-600">{viewDonor.contact_email}</p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-700">Medical History & Source</p>
                  <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-100 italic text-gray-600">
                    {viewDonor.medical_history?.includes('Transferred from') ? (
                      <div className="flex flex-col gap-1">
                        <span>{viewDonor.medical_history.split('|')[0]}</span>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 w-fit mt-1">
                          <Share2 className="h-3 w-3 mr-1" />
                          {viewDonor.medical_history.split('|')[1]?.trim() || "Imported"}
                        </Badge>
                      </div>
                    ) : (
                      viewDonor.medical_history || "No history provided"
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Organs to Donate</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {viewDonor.organs_to_donate.map((o) => (
                      <Badge key={o} className="bg-red-50 text-red-700 border-red-100 font-bold">
                        {o}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Blockchain</p>
                  {viewDonor.blockchain_hash &&
                    viewDonor.blockchain_hash.startsWith("0x") ? (
                    <a
                      className="text-medical-600 underline"
                      target="_blank"
                      href={`https://sepolia.etherscan.io/tx/${viewDonor.blockchain_hash}`}
                    >
                      View on Etherscan
                    </a>
                  ) : (
                    <p className="text-gray-600">
                      {viewDonor.blockchain_hash
                        ? "Demo TX (not on-chain)"
                        : "Not registered"}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Registry Maintenance (Demo Flow)
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant={copiedVerifyId === viewDonor.id ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => {
                        const verifyUrl = `${window.location.origin}/verify-donor/${viewDonor.donor_id}`;
                        navigator.clipboard.writeText(verifyUrl);
                        setCopiedVerifyId(viewDonor.id);
                        showSuccess("Verification link copied! Open in new tab to demo.");
                        setTimeout(() => setCopiedVerifyId(null), 2000);
                      }}
                      className={`flex-1 font-bold ${copiedVerifyId === viewDonor.id ? 'bg-green-100 text-green-700 border-green-200' : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
                    >
                      {copiedVerifyId === viewDonor.id ? (
                        <Check className="h-3 w-3 mr-2" />
                      ) : (
                        <Copy className="h-3 w-3 mr-2" />
                      )}
                      {copiedVerifyId === viewDonor.id ? "Copied!" : "Copy Verify Link"}
                    </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      showSuccess(`WhatsApp Check-in Link sent to ${viewDonor.contact_phone}!`);
                    }}
                    className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Phone className="h-3 w-3 mr-2" />
                    Resend WhatsApp
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleCheckIn(viewDonor.id)}
                    className="flex-1 bg-medical-600 hover:bg-medical-700 text-white font-bold shadow-sm"
                  >
                    <UserCheck className="h-3 w-3 mr-2" />
                    Manual Verify
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
                {viewDonor.signature_ipfs_hash && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://gateway.pinata.cloud/ipfs/${viewDonor.signature_ipfs_hash}`,
                        "_blank",
                      )
                    }
                  >
                    View Document
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => {
                    handleEditDonor(viewDonor);
                    setViewDonor(null);
                  }}
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
        )
      }

      <AlertDialog open={!!confirmDeleteDonor}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete donor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The donor record "
              {confirmDeleteDonor?.full_name}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteDonor(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>

        </AlertDialogContent>
      </AlertDialog>

      {/* GLOBAL LOOKUP MODAL */}
      <Dialog open={isGlobalLookupOpen} onOpenChange={setIsGlobalLookupOpen}>
        <DialogContent className={`${lookupResult ? 'sm:max-w-5xl' : 'sm:max-w-3xl'} transition-all duration-300 overflow-hidden`}>
          <DialogHeader>
            <DialogTitle>Global Donor Lookup (Blockchain)</DialogTitle>
            <DialogDescription>
              Search for verified donors from other hospitals/regions using the immutable blockchain ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Left Column: Search Inputs */}
            <div className="space-y-4 pr-0 md:pr-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Donor Name</label>
                <Input
                  placeholder="Enter full name"
                  value={lookupForm.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLookupForm({ ...lookupForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">OrganLink ID (OGID)</label>
                <Input
                  placeholder="e.g. OL-2025-MUM-X92B"
                  value={lookupForm.organlink_id}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLookupForm({ ...lookupForm, organlink_id: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Govt ID Number (Optional)</label>
                <Input
                  placeholder="e.g. Aadhaar / Passport No."
                  value={lookupForm.govt_id_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLookupForm({ ...lookupForm, govt_id_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Blood Type</label>
                <Select
                  value={lookupForm.blood_type}
                  onValueChange={(v) => setLookupForm({ ...lookupForm, blood_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Blood Types</SelectItem>
                    {bloodTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column: Search Results */}
            <div className="flex flex-col h-full min-h-[300px]">
              {lookupResult ? (
                <div className="flex-1 p-5 bg-blue-50 border border-blue-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-blue-900 flex items-center text-lg">
                      <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                      Verified Registry Record
                    </h4>
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 font-bold">
                      {lookupResult.hospital_origin}, {lookupResult.hospital_city}, {lookupResult.hospital_state}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 text-sm text-blue-800">
                    <div className="flex justify-between border-b border-blue-100 pb-1">
                      <span className="font-medium">Donor Name:</span>
                      <span>{lookupResult.full_name}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-100 pb-1">
                      <span className="font-medium">OrganLink ID:</span>
                      <span className="font-mono">{lookupResult.organlink_id}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-100 pb-1">
                      <span className="font-medium">Last Verified:</span>
                      <span className="font-medium text-blue-700">
                        {lookupResult.last_check_in ? new Date(lookupResult.last_check_in).toLocaleDateString() : "Never"}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-blue-100 pb-1">
                      <span className="font-medium">Blood Type:</span>
                      <Badge variant="secondary" className="h-5">{lookupResult.blood_type}</Badge>
                    </div>
                    <div className="flex justify-between border-b border-blue-100 pb-1">
                      <span className="font-medium">Verification:</span>
                      <span className="flex items-center">
                        <ShieldCheck className="h-3 w-3 mr-1 text-green-600" />
                        {lookupResult.verification_type === 'aadhaar' ? 'Aadhaar Secure' : 'Digital Signature'}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span className="font-medium">Blockchain Hash:</span>
                      <span className="font-mono text-[10px] break-all max-w-[150px] text-right">
                        {lookupResult.blockchain_hash ? `${lookupResult.blockchain_hash.substring(0, 10)}...${lookupResult.blockchain_hash.substring(56)}` : "Pending Sync"}
                      </span>
                    </div>
                  </div>

                  {lookupResult.is_remote && (
                    <Button 
                      onClick={handleImportDonor} 
                      disabled={isImporting}
                      className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 transition-all"
                    >
                      {isImporting ? "Importing..." : "Import to This Hospital"}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/30 text-center p-6 grayscale">
                  <Search className="h-10 w-10 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400 font-medium italic">Enter details and Search Blockchain to view registry status.</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsGlobalLookupOpen(false)}>Close</Button>
            <Button
              onClick={handleGlobalLookup}
              disabled={lookupLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {lookupLoading ? "Searching Chain..." : "Search Blockchain"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Donor Data</DialogTitle>
            <DialogDescription>
              Choose your export format and customize the data to include
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Export Format</p>
              <div className="inline-flex rounded-md border overflow-hidden">
                <button
                  className={`px-4 py-2 text-sm ${exportFormat === "pdf" ? "bg-medical-600 text-white" : "bg-white"} `}
                  onClick={() => setExportFormat("pdf")}
                >
                  PDF
                </button>
                <button
                  className={`px-4 py-2 text-sm border-l ${exportFormat === "excel" ? "bg-medical-600 text-white" : "bg-white"} `}
                  onClick={() => setExportFormat("excel")}
                >
                  Excel/CSV
                </button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Select Fields</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.donorId}
                    onChange={() => toggleExportField('donorId')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Donor ID</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.name}
                    onChange={() => toggleExportField('name')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Name</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.age}
                    onChange={() => toggleExportField('age')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Age</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.gender}
                    onChange={() => toggleExportField('gender')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Gender</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.bloodType}
                    onChange={() => toggleExportField('bloodType')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Blood Type</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.organs}
                    onChange={() => toggleExportField('organs')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Organs</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.contact}
                    onChange={() => toggleExportField('contact')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Contact Info</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.status}
                    onChange={() => toggleExportField('status')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Status</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.verified}
                    onChange={() => toggleExportField('verified')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Verification</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.registrationDate}
                    onChange={() => toggleExportField('registrationDate')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Reg. Date</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={exportFields.txHash}
                    onChange={() => toggleExportField('txHash')}
                    className="rounded border-gray-300 text-medical-600 focus:ring-medical-500"
                  />
                  <span>Tx Hash</span>
                </label>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Date Range (Optional)</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                />
                <Input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const rows = filteredDonors
                  .map((d) => {
                    const row: any = {};
                    if (exportFields.donorId) row.DonorID = d.donor_id;
                    if (exportFields.name) row.Name = d.full_name;
                    if (exportFields.age) row.Age = d.age;
                    if (exportFields.gender) row.Gender = d.gender;
                    if (exportFields.bloodType) row.BloodType = d.blood_type;
                    if (exportFields.organs) row.Organs = d.organs_to_donate.join(", ");
                    if (exportFields.contact) {
                      row.Phone = d.contact_phone;
                      row.Email = d.contact_email;
                    }
                    if (exportFields.status) row.Status = d.is_active ? "ACTIVE" : "INACTIVE";
                    if (exportFields.verified) row.Verified = d.signature_verified ? "Yes" : "No";
                    if (exportFields.registrationDate) {
                      row.Registered = new Date(d.registration_date)
                        .toISOString()
                        .slice(0, 10);
                    }
                    if (exportFields.txHash) row.TxHash = d.blockchain_hash || "";

                    // Always include for filtering
                    row._regDate = new Date(d.registration_date);
                    return row;
                  })
                  .filter((r) => {
                    if (
                      exportFrom &&
                      r._regDate < new Date(exportFrom)
                    )
                      return false;
                    if (exportTo && r._regDate > new Date(exportTo))
                      return false;

                    delete r._regDate; // Remove helper field
                    return true;
                  });

                if (!rows.length) {
                  setExportOpen(false);
                  return;
                }

                if (exportFormat === "pdf") {
                  const jsPDF = (await import("jspdf")).default;
                  const autoTable = (await import("jspdf-autotable"))
                    .default as any;
                  const doc = new jsPDF({ orientation: "landscape" });
                  const cols = Object.keys(rows[0]);
                  doc.text("Donor Report", 14, 14);
                  autoTable(doc, {
                    head: [cols],
                    body: rows.map((r) => cols.map((c) => (r as any)[c])),
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [22, 163, 74] },
                    startY: 20,
                    theme: "grid",
                  });
                  doc.save(`donors_${Date.now()}.pdf`);
                } else {
                  const XLSX = (await import("xlsx")).default as any;
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

                  for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellAddress = XLSX.utils.encode_col(C) + "1";
                    if (!ws[cellAddress]) continue;
                    ws[cellAddress].s = {
                      fill: { fgColor: { rgb: "16A34A" } },
                      font: { bold: true, color: { rgb: "FFFFFF" } },
                      alignment: { horizontal: "center", vertical: "center" }
                    };
                  }

                  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                      if (!ws[cellAddress]) continue;
                      ws[cellAddress].s = {
                        alignment: { horizontal: "center", vertical: "center" }
                      };
                    }
                  }

                  const cols = Object.keys(rows[0]);
                  ws['!cols'] = cols.map(() => ({ wch: 15 }));

                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Donors");
                  XLSX.writeFile(wb, `donors_${Date.now()}.xlsx`);
                }
                setExportOpen(false);
              }}
            >
              Export {exportFormat === "pdf" ? "PDF" : "Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HospitalLayout >
  );
}
