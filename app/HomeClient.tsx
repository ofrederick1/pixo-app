"use client";

import { useEffect, useRef, useState } from "react";



type PreviewFile = {
  id: string;
  file: File;
  previewUrl: string;
};

const isHeicFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  );
};

const isSupportedImageFile = (file: File) => {
  return file.type.startsWith("image/") || isHeicFile(file);
};

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<PreviewFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const [outputFormat, setOutputFormat] = useState("webp");
  const [compressionLevel, setCompressionLevel] = useState(80);
  const [resizeWidth, setResizeWidth] = useState(1600);

  const textPrimary = isDarkMode ? "text-white" : "text-[#111111]";
  const textSecondary = isDarkMode ? "text-white/60" : "text-black/60";
  const textMuted = isDarkMode ? "text-white/40" : "text-black/40";

  const panelClass = isDarkMode
    ? "border border-white/10 bg-white/[0.03]"
    : "border border-black/10 bg-white/70";

  const softPanelClass = isDarkMode
    ? "border border-white/8 bg-white/[0.02]"
    : "border border-black/8 bg-black/[0.02]";

  const inputSurfaceClass = isDarkMode
    ? "border border-white/10 bg-white/[0.03]"
    : "border border-black/10 bg-black/[0.03]";

  const chipClass = isDarkMode
    ? "border border-white/10 bg-white/[0.03] text-white/90"
    : "border border-black/10 bg-black/[0.04] text-black/80";

  const handleChooseFiles = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const addFiles = (files: File[]) => {
    setSelectedFiles((prev) => {
      const existingKeys = new Set(
        prev.map((item) => `${item.file.name}-${item.file.size}`),
      );

      const newItems = files
        .filter((file) => isSupportedImageFile(file))
        .filter((file) => !existingKeys.has(`${file.name}-${file.size}`))
        .map((file) => ({
          id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          previewUrl: URL.createObjectURL(file),
        }));

      return [...prev, ...newItems];
    });
  };

  const prepareFiles = async (files: File[]) => {
    const processedFiles: File[] = [];

    for (const file of files) {
      if (!isSupportedImageFile(file)) continue;

      if (isHeicFile(file)) {
        try {
          const heic2any = (await import("heic2any")).default;
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });

          const normalizedBlob = Array.isArray(convertedBlob)
            ? convertedBlob[0]
            : convertedBlob;

          const convertedFile = new File(
            [normalizedBlob as Blob],
            file.name.replace(/\.(heic|heif)$/i, ".jpg"),
            { type: "image/jpeg" },
          );

          processedFiles.push(convertedFile);
        } catch (error) {
          console.error("HEIC conversion failed:", error);
          alert(
            `Could not convert ${file.name}. Please try a different image.`,
          );
        }
      } else {
        processedFiles.push(file);
      }
    }

    return processedFiles;
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const processedFiles: File[] = [];

    for (const file of files) {
      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");

      if (isHeic) {
        try {
          const heic2any = (await import("heic2any")).default;

          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });

          const blob = Array.isArray(convertedBlob)
            ? convertedBlob[0]
            : convertedBlob;

          const convertedFile = new File(
            [blob as Blob],
            file.name.replace(/\.(heic|heif)$/i, ".jpg"),
            { type: "image/jpeg" },
          );

          processedFiles.push(convertedFile);
        } catch (error) {
          console.error("HEIC conversion failed:", error);
        }
      } else {
        processedFiles.push(file);
      }
    }

    addFiles(processedFiles);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files || []);
    const processedFiles = await prepareFiles(files);
    addFiles(processedFiles);
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => {
      const fileToRemove = prev.find((item) => item.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearAllFiles = () => {
    selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0 || isProcessing) return;

    try {
      setIsProcessing(true);

      const JSZip = (await import("jszip")).default;

      const formData = new FormData();

      selectedFiles.forEach((item) => {
        formData.append("files", item.file);
      });

      formData.append("format", outputFormat);
      formData.append("width", String(resizeWidth));
      formData.append("quality", String(compressionLevel));

      const res = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        alert(data.error || "Processing failed");
        return;
      }

      if (!data.files || data.files.length === 0) {
        alert("No processed files returned");
        return;
      }

      const zip = new JSZip();

      data.files.forEach((file: any) => {
        zip.file(file.name, file.data, { base64: true });
      });

      const blob = await zip.generateAsync({ type: "blob" });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "pixo-processed-images.zip";
      link.click();
    } catch (error) {
      console.error(error);
      alert("Something went wrong while processing your images.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      selectedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [selectedFiles]);

  const fakeProgress =
    selectedFiles.length > 0 ? Math.min(selectedFiles.length * 10, 100) : 0;

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${
        isDarkMode ? "bg-[#030806] text-white" : "bg-[#f6f3eb] text-[#111111]"
      }`}
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          {isDarkMode ? (
            <>
              <div className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />
              <div className="absolute left-1/2 top-24 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.10),transparent_45%)]" />
            </>
          ) : (
            <>
              <div className="absolute left-1/2 top-0 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-green-400/10 blur-3xl" />
              <div className="absolute left-1/2 top-24 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.08),transparent_45%)]" />
            </>
          )}
        </div>

        <div className="relative mx-auto flex min-h-screen max-w-[1400px] flex-col px-6 pb-16 pt-5 md:px-10">
          <header
            className={`rounded-full px-4 py-3 backdrop-blur-md ${panelClass}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2ee66b] text-lg font-bold text-black">
                  P
                </div>
                <span
                  className={`text-2xl font-semibold tracking-tight ${textPrimary}`}
                >
                  Pixo
                </span>
              </div>

              <nav className="hidden items-center gap-8 text-base md:flex">
                <button
                  className={`transition hover:opacity-100 ${isDarkMode ? "text-white/80" : "text-black/70"}`}
                >
                  Pricing
                </button>
                <button
                  className={`transition hover:opacity-100 ${isDarkMode ? "text-white/80" : "text-black/70"}`}
                >
                  Guide
                </button>
              </nav>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsDarkMode((prev) => !prev)}
                  className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                    isDarkMode
                      ? "border border-white/10 bg-white/[0.04] text-white/90"
                      : "border border-black/10 bg-black/[0.04] text-black/80"
                  }`}
                >
                  {isDarkMode ? "Light mode" : "Dark mode"}
                </button>
                <button className="rounded-full border border-[#2ee66b]/30 bg-[#163821] px-6 py-3 text-sm font-semibold text-[#8bffae]">
                  Start free
                </button>
              </div>
            </div>
          </header>

          <section className="mx-auto flex w-full max-w-[980px] flex-col items-center px-4 pt-10 text-center md:pt-14">
            <h1
              className={`max-w-[960px] text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-xl md:text-[80px] ${textPrimary}`}
            >
              Resize, rename,<br/>
              & optimize your images –
              all at once.
            </h1>

            <p
              className={`mt-8 max-w-[900px] text-xl leading-9 md:text-[18px] ${textSecondary}`}
            >
              Pixo helps you prep images fast. Upload a batch, clean them up,
              and export everything for your website.
            </p>

            <div
              className={`mt-10 text-sm font-semibold uppercase tracking-[0.12em] ${textMuted}`}
            >
              The perfect solution for:
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {[
                "Shopify",
                "WordPress",
                "Squarespace",
                "Wix",
                "MLS Listings",
              ].map((item) => (
                <button
                  key={item}
                  className={`rounded-full px-5 py-3 text-base font-semibold ${chipClass}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>

          <section
            className={`mx-auto mt-16 w-full max-w-[1280px] rounded-[34px] p-6 shadow-[0_12px_50px_rgba(0,0,0,0.18)] backdrop-blur-sm md:p-8 ${panelClass}`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  className={`text-2xl font-semibold tracking-tight ${textPrimary}`}
                >
                  Upload Your Images
                </h2>
                <p className={`mt-1 text-base ${textSecondary}`}>
                  Upload, adjust settings, preview, and export
                </p>
              </div>

              <span className="rounded-full border border-[#2ee66b]/20 bg-[#0d2a16] px-4 py-2 text-sm font-semibold text-[#63ff96]">
                Live preview
              </span>
            </div>

            <div
              className={`rounded-[28px] border border-dashed p-8 ${
                isDarkMode
                  ? "border-[#2ee66b]/40 bg-[#07110c]"
                  : "border-[#2ee66b]/30 bg-white/50"
              }`}
            >
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex min-h-[190px] flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center transition ${
                  isDragging
                    ? isDarkMode
                      ? "border-[#36f27c] bg-[#0d1f14] shadow-[0_0_40px_rgba(54,242,124,0.10)]"
                      : "border-[#36f27c] bg-[#eaf9ef] shadow-[0_0_40px_rgba(54,242,124,0.10)]"
                    : isDarkMode
                      ? "border-[#2ee66b]/30 bg-transparent"
                      : "border-[#2ee66b]/25 bg-transparent"
                }`}
              >
                <h3
                  className={`text-4xl font-semibold tracking-tight ${textPrimary}`}
                >
                  {isDragging
                    ? "Drop your images now"
                    : "Drop your images here"}
                </h3>

                <p
                  className={`mt-4 max-w-[780px] text-lg leading-8 ${textSecondary}`}
                >
                  Drag in PNG, JPG, WebP, or HEIC files.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.HEIC,.heif,.HEIF"
                  className="hidden"
                  onChange={handleFilesChange}
                />

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleChooseFiles}
                    className="rounded-full bg-[#36f27c] px-8 py-4 text-base font-bold text-[#06220f] transition hover:scale-[1.02]"
                  >
                    Choose files
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className={`rounded-[22px] p-4 ${softPanelClass}`}>
                  <label className={`text-sm ${textMuted}`}>
                    Output format
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    className={`mt-3 w-full rounded-2xl px-4 py-4 text-lg font-semibold outline-none ${inputSurfaceClass} ${textPrimary}`}
                  >
                    <option
                      value="webp"
                      className={isDarkMode ? "bg-[#07110c]" : "bg-white"}
                    >
                      WebP
                    </option>
                    <option
                      value="jpg"
                      className={isDarkMode ? "bg-[#07110c]" : "bg-white"}
                    >
                      JPG
                    </option>
                    <option
                      value="png"
                      className={isDarkMode ? "bg-[#07110c]" : "bg-white"}
                    >
                      PNG
                    </option>
                    <option
                      value="heic"
                      className={isDarkMode ? "bg-[#07110c]" : "bg-white"}
                    >
                      HEIC
                    </option>
                  </select>
                </div>

                <div className={`rounded-[22px] p-4 ${softPanelClass}`}>
                  <label className={`text-sm ${textMuted}`}>
                    Compression level
                  </label>
                  <div
                    className={`mt-3 rounded-2xl px-4 py-4 ${inputSurfaceClass}`}
                  >
                    <div
                      className={`mb-3 text-2xl font-semibold ${textPrimary}`}
                    >
                      {compressionLevel}
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={compressionLevel}
                      onChange={(e) =>
                        setCompressionLevel(Number(e.target.value))
                      }
                      className="w-full accent-[#38ef7d]"
                    />
                  </div>
                </div>

                <div className={`rounded-[22px] p-4 ${softPanelClass}`}>
                  <label className={`text-sm ${textMuted}`}>Resize width</label>
                  <div
                    className={`mt-3 rounded-2xl px-4 py-4 ${inputSurfaceClass}`}
                  >
                    <input
                      type="number"
                      min="100"
                      step="100"
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(Number(e.target.value))}
                      className={`w-full bg-transparent text-2xl font-semibold outline-none ${textPrimary}`}
                    />
                  </div>
                </div>
              </div>

              <div className={`mt-8 rounded-[24px] p-5 ${softPanelClass}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className={`text-2xl font-semibold ${textPrimary}`}>
                    Selected files
                  </h3>

                  {selectedFiles.length > 0 && (
                    <button
                      onClick={clearAllFiles}
                      className={`rounded-full px-4 py-2 text-sm font-semibold ${chipClass}`}
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {selectedFiles.length === 0 ? (
                  <div
                    className={`rounded-[22px] p-5 ${softPanelClass} ${textMuted}`}
                  >
                    No files selected yet.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {selectedFiles.map((item) => (
                      <div
                        key={item.id}
                        className={`overflow-hidden rounded-[22px] ${softPanelClass}`}
                      >
                        <div className="aspect-[4/3] w-full bg-black/20">
                          <img
                            src={item.previewUrl}
                            alt={item.file.name}
                            className="h-full w-full object-cover"
                          />
                        </div>

                        <div className="p-4">
                          <div
                            className={`truncate text-lg font-semibold ${textPrimary}`}
                          >
                            {item.file.name}
                          </div>
                          <div className={`mt-1 text-sm ${textSecondary}`}>
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <span className="rounded-full border border-[#2ee66b]/20 bg-[#0d2a16] px-3 py-1 text-xs font-semibold text-[#63ff96]">
                              Ready
                            </span>

                            <button
                              onClick={() => removeFile(item.id)}
                              className={`rounded-full px-4 py-2 text-sm font-semibold ${chipClass}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleProcess}
                    disabled={selectedFiles.length === 0 || isProcessing}
                    className="rounded-full bg-[#36f27c] px-10 py-4 text-base font-bold text-[#06220f] transition enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : "Start processing"}
                  </button>
                </div>
              </div>

              <div className={`mt-6 rounded-[22px] p-4 ${softPanelClass}`}>
                <div
                  className={`mb-3 flex items-center justify-between text-base ${textSecondary}`}
                >
                  <span>
                    {selectedFiles.length > 0
                      ? `${selectedFiles.length} image${
                          selectedFiles.length > 1 ? "s" : ""
                        } selected`
                      : "No images selected"}
                  </span>
                  <span>
                    {isProcessing ? "Working..." : `${fakeProgress}%`}
                  </span>
                </div>
                <div
                  className={
                    isDarkMode
                      ? "h-4 rounded-full bg-white/8"
                      : "h-4 rounded-full bg-black/8"
                  }
                >
                  <div
                    className="h-4 rounded-full bg-[#38ef7d] transition-all duration-300"
                    style={{
                      width: isProcessing ? "100%" : `${fakeProgress}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}