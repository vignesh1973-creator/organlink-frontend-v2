import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Globe, Shield, Link as LinkIcon, Network } from "lucide-react";
import HospitalLayout from "@/components/hospital/HospitalLayout";

export default function HospitalAbout() {
  return (
    <HospitalLayout title="About OrganLink" subtitle="Understanding the Organ Transplant Ecosystem">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-medical-600" />
              <span>OrganLink: Bridging the Gap</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 leading-relaxed mb-4">
              OrganLink is a decentralized, AI-driven platform designed to modernize the organ donation ecosystem. By combining blockchain technology with artificial intelligence, we bring transparency, fairness, and speed to the critical process of organ matching and allocation.
            </p>
            <p className="text-gray-600 leading-relaxed">
              To fully understand our impact, it's essential to look at how organ allocation systems function globally and how OrganLink integrates or improves upon these structures.
            </p>
          </CardContent>
        </Card>

        {/* Global Systems */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Globe className="h-5 w-5 text-blue-600" />
                <span>The US System: UNOS</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                In the United States, the <strong>United Network for Organ Sharing (UNOS)</strong> manages the national transplant waiting list, matching donors to recipients.
              </p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Operates under contract with the federal government.</li>
                <li>Uses algorithms based on medical urgency, blood type, and geography.</li>
                <li>Maintains a centralized database for all transplant centers.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Network className="h-5 w-5 text-orange-600" />
                <span>The Indian System: THOTA</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">
                In India, the <strong>Transplantation of Human Organs and Tissues Act (THOTA)</strong> regulates the removal, storage, and transplantation of organs. This is managed by:
              </p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li><strong>NOTTO:</strong> National Organ and Tissue Transplant Organization.</li>
                <li><strong>ROTTO:</strong> Regional Organ and Tissue Transplant Organization.</li>
                <li><strong>SOTTO:</strong> State Organ and Tissue Transplant Organization.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* How OrganLink Connects */}
        <Card className="bg-gradient-to-br from-medical-50 to-white border-medical-100">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5 text-medical-600" />
              <span>How OrganLink Connects & Enhances</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              While organizations like UNOS and NOTTO rely heavily on centralized databases and regional coordination, <strong>OrganLink</strong> introduces a decentralized framework that can act as a powerful overlay to these existing systems.
            </p>
            
            <div className="space-y-4 mt-6">
              <div className="flex gap-4">
                <div className="mt-1 bg-medical-100 p-2 rounded-full h-fit">
                  <Shield className="h-4 w-4 text-medical-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Immutable Records (Blockchain)</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Unlike traditional databases that can be vulnerable to tampering or single points of failure, OrganLink uses blockchain. This ensures that every donor registration, patient addition, and match proposal is securely and immutably recorded, fostering absolute trust.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 bg-medical-100 p-2 rounded-full h-fit">
                  <Network className="h-4 w-4 text-medical-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Decentralized Autonomous Organizations (DAOs)</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Instead of policies being dictated strictly top-down, OrganLink allows registered hospitals and oversight bodies to vote on policy changes and protocol updates dynamically, much like how ROTTO/SOTTO manage regional differences but with greater transparency.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 bg-medical-100 p-2 rounded-full h-fit">
                  <Globe className="h-4 w-4 text-medical-700" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Scalable AI Matching & Inter-network Coordination</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    OrganLink primarily focuses on optimizing domestic (state-to-state and city-to-city) organ allocation, respecting strict organ survival times (Cold Ischemia Time) and regional laws. However, OrganLink's decentralized architecture is designed to support future inter-network coordination between national transplant systems if legal and medical regulations permit.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </HospitalLayout>
  );
}
