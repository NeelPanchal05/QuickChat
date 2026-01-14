import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function TermsAndConditions({ onBack, onAccept }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* Header */}
      <div className="p-4 backdrop-blur-xl bg-black/70 border-b border-white/5 flex items-center gap-3 sticky top-0 z-10">
        <Button
          onClick={onBack}
          variant="ghost"
          size="icon"
          className="text-[#A1A1AA] hover:text-white"
        >
          <ArrowLeft size={20} />
        </Button>
        <h1 className="text-xl font-bold text-white">Terms & Conditions</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Introduction */}
          <section className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl p-4 md:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                By accessing and using QuickChat, you accept and agree to be
                bound by the terms and provision of this agreement. If you do
                not agree to abide by the above, please do not use this service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                2. Use License
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed mb-3">
                Permission is granted to temporarily download one copy of the
                materials (information or software) on QuickChat for personal,
                non-commercial transitory viewing only. This is the grant of a
                license, not a transfer of title, and under this license you may
                not:
              </p>
              <ul className="text-[#A1A1AA] text-sm md:text-base space-y-2 ml-4">
                <li>• Modifying or copying the materials</li>
                <li>
                  • Using the materials for any commercial purpose or for any
                  public display
                </li>
                <li>
                  • Attempting to decompile or reverse engineer any software
                  contained on the platform
                </li>
                <li>
                  • Removing any copyright or other proprietary notations from
                  the materials
                </li>
                <li>
                  • Transferring the materials to another person or "mirroring"
                  the materials on any other server
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                3. Disclaimer
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                The materials on QuickChat are provided on an 'as is' basis.
                QuickChat makes no warranties, expressed or implied, and hereby
                disclaims and negates all other warranties including, without
                limitation, implied warranties or conditions of merchantability,
                fitness for a particular purpose, or non-infringement of
                intellectual property or other violation of rights.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                4. Limitations
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                In no event shall QuickChat or its suppliers be liable for any
                damages (including, without limitation, damages for loss of data
                or profit, or due to business interruption) arising out of the
                use or inability to use the materials on QuickChat, even if
                QuickChat or an authorized representative has been notified
                orally or in writing of the possibility of such damage.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                5. Accuracy of Materials
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                The materials appearing on QuickChat could include technical,
                typographical, or photographic errors. QuickChat does not
                warrant that any of the materials on our website are accurate,
                complete, or current. QuickChat may make changes to the
                materials contained on its website at any time without notice.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">6. Links</h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                QuickChat has not reviewed all of the sites linked to its
                website and is not responsible for the contents of any such
                linked site. The inclusion of any link does not imply
                endorsement by QuickChat of the site. Use of any such linked
                website is at the user's own risk.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                7. Modifications
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                QuickChat may revise these terms of service for its website at
                any time without notice. By using this website, you are agreeing
                to be bound by the then current version of these terms of
                service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                8. Governing Law
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                These terms and conditions are governed by and construed in
                accordance with the laws of the jurisdiction in which QuickChat
                operates, and you irrevocably submit to the exclusive
                jurisdiction of the courts located in that location.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">
                9. User Content & Conduct
              </h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed mb-3">
                You agree not to post, upload, or transmit any content that:
              </p>
              <ul className="text-[#A1A1AA] text-sm md:text-base space-y-2 ml-4">
                <li>
                  • Is illegal, threatening, abusive, defamatory, obscene,
                  vulgar, or otherwise objectionable
                </li>
                <li>• Violates intellectual property rights</li>
                <li>• Contains viruses or malicious code</li>
                <li>• Impersonates any person or entity</li>
                <li>• Harasses, intimidates, or threatens other users</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-white mb-3">10. Privacy</h2>
              <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed">
                Your use of QuickChat is also governed by our Privacy Policy.
                Please review our Privacy Policy to understand our practices. By
                using QuickChat, you consent to the collection and use of your
                information as described in our Privacy Policy.
              </p>
            </div>
          </section>

          {/* Acceptance Section */}
          <section className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl p-4 md:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="accept"
                checked={accepted}
                onCheckedChange={setAccepted}
                className="mt-1"
              />
              <label
                htmlFor="accept"
                className="text-[#A1A1AA] text-sm md:text-base cursor-pointer"
              >
                I have read, understood, and agree to be bound by the Terms &
                Conditions above
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={onBack}
                variant="outline"
                className="flex-1 border-white/10 text-[#A1A1AA] hover:text-white"
              >
                Decline
              </Button>
              <Button
                onClick={onAccept}
                disabled={!accepted}
                className="flex-1 bg-[#7000FF] hover:bg-[#5B00D1] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Accept & Continue
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
