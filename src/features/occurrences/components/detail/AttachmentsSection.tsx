import { Paperclip } from "lucide-react";
import { AttachmentGallery } from "@/features/occurrences/components/attachments/AttachmentGallery";
import { getSignedUrlsForAttachments } from "@/features/occurrences/hooks/useAttachments";
import { useQuery } from "@tanstack/react-query";

interface AttachmentsSectionProps {
  occurrenceId: string;
  subtipo: string;
  anexos?: any[];
}

export function AttachmentsSection({ occurrenceId, subtipo, anexos = [] }: AttachmentsSectionProps) {
  const { data: attachments, isLoading } = useQuery({
    queryKey: ["signed-attachments", occurrenceId, anexos],
    queryFn: () => getSignedUrlsForAttachments(anexos),
    enabled: anexos.length > 0,
    initialData: [],
  });

  if (anexos.length === 0) {
    // If no attachments, show empty state immediately
    return (
      <div className="rounded-xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Paperclip className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Anexos</h3>
        </div>
        <AttachmentGallery
          attachments={[]}
          loading={false}
          emptyMessage="Nenhum anexo nesta ocorrência"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Paperclip className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Anexos</h3>
      </div>
      <AttachmentGallery
        attachments={attachments}
        loading={isLoading && anexos.length > 0}
        emptyMessage="Nenhum anexo nesta ocorrência"
      />
    </div>
  );
}
