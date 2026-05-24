import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Served from packages/web/public/smalljobs.apk, or override via VITE_APK_DOWNLOAD_URL */
const APK_URL =
  import.meta.env.VITE_APK_DOWNLOAD_URL?.trim() || "/smalljobs.apk";
const APK_FILENAME = "SmallJobs.apk";

type DownloadButtonProps = {
  variant?: "primary" | "inverse";
  className?: string;
  label?: string;
  loadingLabel?: string;
};

export function DownloadButton({
  variant = "primary",
  className,
  label = "Download for Android",
  loadingLabel = "Starting download…",
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);

    try {
      const isSameOrigin = APK_URL.startsWith("/");
      if (isSameOrigin) {
        const res = await fetch(APK_URL, { method: "HEAD" });
        if (!res.ok) {
          setError(
            "APK not uploaded yet. Place smalljobs.apk in packages/web/public/ and redeploy.",
          );
          return;
        }
      }

      const a = document.createElement("a");
      a.href = APK_URL;
      a.download = APK_FILENAME;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setError("Could not start download. Check your connection and try again.");
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <Button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={downloading ? loadingLabel : label}
        className={cn(
          "h-auto rounded-2xl px-6 py-[18px] text-base font-semibold transition-all",
          variant === "primary" &&
            "bg-sj-primary text-white hover:bg-sj-primary/90",
          variant === "inverse" &&
            "bg-white text-sj-primary hover:bg-white/90",
          className,
        )}
      >
        <Download className="size-5" aria-hidden="true" />
        {downloading ? loadingLabel : label}
      </Button>
      {error ? (
        <p className="text-center text-xs leading-relaxed text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
