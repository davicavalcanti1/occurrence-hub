import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Attachment {
  id?: string; // Optional for JSONB
  occurrence_id?: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  file_url: string;
  is_image: boolean;
  uploaded_em?: string;
  uploaded_by?: string;
  signed_url?: string | null;
}

function cleanStoragePath(path: string): string {
  if (!path) return "";
  let clean = path;
  // Remove leading slash
  if (clean.startsWith("/")) clean = clean.substring(1);
  // Remove bucket name if present at start
  if (clean.startsWith("occurrence-attachments/")) clean = clean.substring("occurrence-attachments/".length);
  return clean;
}


// Fetch attachments with signed URLs for public access
// DEPRECATED: Use occurrence.anexos instead. 
// Kept for backward compatibility if needed, but updated to return empty if table is empty.
export function useAttachmentsWithSignedUrls(occurrenceId: string | undefined) {
  return useQuery({
    queryKey: ["attachments-signed", occurrenceId],
    queryFn: async () => {
      if (!occurrenceId) return [];

      // Attempt to fetch from occurrence_attachments table (Legacy)
      const { data, error } = await supabase
        .from("occurrence_attachments")
        .select("*")
        .eq("occurrence_id", occurrenceId)
        .order("uploaded_em", { ascending: true });

      if (error) {
        console.log("Legacy attachments fetch failed or table empty/missing", error);
        return [];
      }

      // Generate signed URLs for each attachment
      const attachmentsWithUrls = await Promise.all(
        (data || []).map(async (att: any) => {
          const cleanPath = cleanStoragePath(att.file_url);

          const { data: urlData, error } = await supabase.storage
            .from("occurrence-attachments")
            .createSignedUrl(cleanPath, 60 * 60 * 24 * 365); // 1 year

          return {
            ...att,
            is_image: att.is_image ?? isImageMimeType(att.file_type),
            signed_url: urlData?.signedUrl || null,
          };
        })
      );

      return attachmentsWithUrls as (Attachment & { signed_url: string | null })[];
    },
    enabled: !!occurrenceId,
  });
}

// Helper to just upload files and return the attachment objects
export async function uploadFilesToStorage(
  files: File[],
  occurrenceId: string, // We can use a temp ID or the real one
  userId: string
): Promise<Attachment[]> {
  const uploadedAttachments: Attachment[] = [];

  for (const file of files) {
    const isImage = isImageMimeType(file.type);
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${occurrenceId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("occurrence-attachments")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Erro ao fazer upload de ${file.name}: ${uploadError.message}`);
    }

    const newAttachment: Attachment = {
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url: filePath,
      is_image: isImage,
      uploaded_by: userId,
      uploaded_em: new Date().toISOString()
    };

    uploadedAttachments.push(newAttachment);
  }

  return uploadedAttachments;
}

// Upload attachments for an occurrence
export function useUploadAttachments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      occurrenceId,
      files,
      userId,
      tableName = "occurrences_laudo"
    }: {
      occurrenceId: string;
      files: File[];
      userId: string;
      tableName?: string;
    }) => {

      const uploadedAttachments = await uploadFilesToStorage(files, occurrenceId, userId);

      // Update JSONB column 'anexos'
      // fetch current
      const { data: currentData, error: fetchError } = await supabase
        .from(tableName as any)
        .select("anexos")
        .eq("id", occurrenceId)
        .single();

      if (fetchError) throw fetchError;

      const currentAnexos = (currentData as any)?.anexos || [];
      const updatedAnexos = [...currentAnexos, ...uploadedAttachments];

      const { error: updateError } = await supabase
        .from(tableName as any)
        .update({ anexos: updatedAnexos })
        .eq("id", occurrenceId);

      if (updateError) throw updateError;

      // Also try to insert into legacy table for compatibility just in case?
      // No, let's move forward. "Eliminating redundant tables".

      return uploadedAttachments;
    },
    onSuccess: (_, { occurrenceId }) => {
      queryClient.invalidateQueries({ queryKey: ["attachments", occurrenceId] });
      queryClient.invalidateQueries({ queryKey: ["occurrences"] });
      queryClient.invalidateQueries({ queryKey: ["occurrence", occurrenceId] });

      toast({
        title: "Anexos enviados",
        description: "Os arquivos foram enviados com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar anexos",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}


// Get signed URLs for a list of attachments
export async function getSignedUrlsForAttachments(attachments: Attachment[]): Promise<(Attachment & { signed_url: string })[]> {
  const results = await Promise.all(
    attachments.map(async (att) => {
      const cleanPath = cleanStoragePath(att.file_url);
      const { data } = await supabase.storage
        .from("occurrence-attachments")
        .createSignedUrl(cleanPath, 60 * 60 * 24 * 365); // 1 year

      return {
        ...att,
        signed_url: data?.signedUrl || "",
        is_image: att.is_image ?? isImageMimeType(att.file_type),
      };
    })
  );

  return results;
}

// Helper function to check if a mime type is an image
function isImageMimeType(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

// Helper to format file size
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
