import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, CheckCircle2, AlertCircle, Phone, Building2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DonorVerify() {
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);
  const [donorData, setDonorData] = useState<{full_name: string, hospital_name: string, city: string, state: string} | null>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const response = await fetch(`/api/hospital/donors/public/verify/${id}`);
        const result = await response.json();
        if (result.success) {
          setDonorData(result.data);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setFetching(false);
      }
    };
    fetchInfo();
  }, [id]);

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hospital/donors/public/verify/${id}`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        toast({
          title: "Status Verified!",
          description: "Thank you for helping us keep the registry up to date.",
        });
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-medical-600 font-medium">Loading Verification Securely...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="w-10 h-10 bg-medical-600 rounded-lg flex items-center justify-center shadow-lg">
          <ShieldCheck className="text-white h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OrganLink <span className="text-medical-600">Registry</span></h1>
      </div>

      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-medical-600 animate-in fade-in zoom-in duration-300">
        {!success && !error && donorData ? (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Phone className="text-blue-600 h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-slate-800 tracking-tight">30-Day Activity Check</CardTitle>
              <CardDescription className="text-slate-500 font-medium mt-2">
                Help us verify your medical entry for <br/> 
                <span className="text-medical-700 font-bold">{donorData.hospital_name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <div className="flex items-center gap-3 mb-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">{donorData.full_name}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-xs text-slate-500">{donorData.city}, {donorData.state}</span>
                 </div>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed text-center">
                By clicking below, you confirm that you are still willing and eligible to remain in the National Organ Donor Registry.
              </p>
              
              <Button 
                onClick={handleVerify} 
                disabled={loading}
                className="w-full h-12 text-lg bg-medical-600 hover:bg-medical-700 text-white font-semibold shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                {loading ? "Verifying..." : "Confirm Status"}
              </Button>
              <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">
                SECURE SECONDARY VERIFICATION SYSTEM
              </p>
            </CardContent>
          </>
        ) : success ? (
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 scale-in-center">
              <CheckCircle2 className="text-green-600 h-12 w-12" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">Verified Successfully!</CardTitle>
            <p className="text-slate-600 px-4">
              Thank you, **{donorData?.full_name}**. Your record at **{donorData?.hospital_name}** has been marked as active.
            </p>
            <div className="pt-6">
               <Button variant="outline" onClick={() => window.close()} className="w-full">
                 Close Verification Tab
               </Button>
            </div>
          </CardContent>
        ) : (
          <CardContent className="py-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="text-red-600 h-10 w-10" />
            </div>
            <CardTitle className="text-xl font-bold text-red-800">Verification Link Invalid</CardTitle>
            <p className="text-slate-600 px-6">
              This link may have expired or the record was not found. Please contact your hospital for a new link.
            </p>
          </CardContent>
        )}
      </Card>
      
      <div className="mt-8 flex items-center gap-4 text-slate-300">
         <span className="text-[10px] font-bold tracking-tighter">AES-256 ENCRYPTED</span>
         <span className="text-[10px] font-bold tracking-tighter">BLOCKCHAIN VERIFIED</span>
      </div>
    </div>
  );
}
