import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Moon, FileText, Info } from 'lucide-react';
import nocturiaPreview from '@/assets/eau-nocturia-cheatsheet-preview.png';

const EAU_NOCTURIA_PDF_URL = 'https://d56bochluxqnz.cloudfront.net/documents/EAU-Cheat-Sheet-EAU-Guidelines-on-Male-LUTS-V-Management-of-Nocturia.pdf';

interface NocturiaGuidanceProps {
  isMalePatient: boolean;
  hasNocturiaDiagnosis: boolean;
}

export function NocturiaGuidance({ isMalePatient, hasNocturiaDiagnosis }: NocturiaGuidanceProps) {
  // Only show guidance for male patients with nocturia diagnosis
  if (!isMalePatient || !hasNocturiaDiagnosis) {
    return null;
  }

  return (
    <Card variant="elevated" className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Moon className="h-5 w-5 text-primary" />
          Nokturi – Klinisk Vägledning (EAU)
          <Badge variant="outline" className="ml-auto text-xs bg-info-soft text-info border-info/30">
            Endast för män
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Explanatory Text */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-info-soft/50 border border-info/20">
          <Info className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Baserat på blåsdagboken och det diagnostiska mönstret har nokturi identifierats. 
            Nedan finns en referens från EAU Guidelines Cheat Sheet för manlig LUTS – Hantering av nokturi.
          </p>
        </div>

        {/* Preview Image & Link */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Preview Image */}
          <a 
            href={EAU_NOCTURIA_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group shrink-0 block w-full sm:w-48 overflow-hidden rounded-lg border border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md"
          >
            <div className="relative aspect-[3/4] bg-muted">
              <img 
                src={nocturiaPreview} 
                alt="EAU Nocturia Management Guideline Preview"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                <span className="text-white text-xs font-medium flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Öppna PDF
                </span>
              </div>
            </div>
          </a>

          {/* Link & Description */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">EAU Guidelines on Male LUTS</p>
                <p className="text-sm text-muted-foreground">
                  V. Management of Nocturia – Clinical Cheat Sheet
                </p>
              </div>
            </div>
            
            <a
              href={EAU_NOCTURIA_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              Öppna EAU Riktlinjedokument
            </a>

            <p className="text-xs text-muted-foreground">
              Dokumentet öppnas i en ny flik. Innehåller kliniska riktlinjer för diagnostik och behandling av nokturi hos män.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
