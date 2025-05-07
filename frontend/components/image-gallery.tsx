"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, ZoomIn } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"

interface ImageGalleryProps {
  images: Array<{ style: string; url: string }>
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<{ style: string; url: string } | null>(null)

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">No images generated yet</p>
      </div>
    )
  }
  
  // Download a single image to local file system
  const downloadImage = (url: string, filename: string) => {
    // Log the URL being fetched for debugging
    console.log("Attempting to download from URL:", url);
    
    // Create a blob URL version for downloading
    downloadFileFromURL(url, filename);
  };
  
  // Helper function to properly handle different URL types
  const downloadFileFromURL = (url: string, filename: string) => {
    // Show initial message
    toast.info(`Preparing download: ${filename}`);
    
    try {
      // For URLs starting with http, use XMLHttpRequest which can handle CORS better
      if (url.startsWith('http')) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        
        xhr.onload = function() {
          if (this.status === 200) {
            const blob = new Blob([this.response], {type: 'image/png'});
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast.success(`Downloaded: ${filename}`);
          } else {
            console.error(`Error downloading ${filename}: status ${this.status}`);
            toast.error(`Error downloading ${filename}: server returned ${this.status}`);
          }
        };
        
        xhr.onerror = function() {
          console.error(`Network error downloading ${filename}`);
          toast.error(`Network error downloading ${filename}. Trying alternative method...`);
          
          // Fallback to direct method for history items
          tryDirectDownload(url, filename);
        };
        
        xhr.send();
      } else {
        // For relative URLs, handle specially, making sure to prepend API_URL
        const fullUrl = url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${url}` : url;
        console.log("Using Full URL:", fullUrl);
        
        // Try direct fetch first
        fetch(fullUrl)
          .then(response => {
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            return response.blob();
          })
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            toast.success(`Downloaded: ${filename}`);
          })
          .catch(error => {
            console.error("Fetch error:", error);
            toast.error(`Fetch error: ${error.message}. Trying alternative method...`);
            
            // Try direct method as fallback
            tryDirectDownload(fullUrl, filename);
          });
      }
    } catch (error: any) {
      console.error("Download error:", error);
      toast.error(`Failed to download: ${error.message || "Unknown error"}.`);
      
      // Last resort - try opening in new tab
      window.open(url, '_blank');
    }
  };
  
  // Last resort direct download attempt
  const tryDirectDownload = (url: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.info("Attempted alternative download method - check your downloads folder");
    } catch (e: any) {
      console.error("Final download attempt failed:", e);
      toast.error("All download methods failed. Try right-clicking the image and saving it manually.");
    }
  };
  
  const downloadAllImages = () => {
    toast.info("Starting download of all images...");
    
    images.forEach((image, index) => {
      setTimeout(() => {
        downloadImage(
          image.url,
          `${image.style.toLowerCase().replace(/\s+/g, "-")}.png`
        );
      }, index * 500); // Stagger downloads by 500ms to avoid browser limitations
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Generated Images</h2>
        <Button variant="outline" size="sm" onClick={downloadAllImages}>
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="relative group">
              <img
                src={image.url || "/placeholder.svg"}
                alt={`${image.style} style`}
                className="w-full aspect-square object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="icon" onClick={() => setSelectedImage(image)}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>{selectedImage?.style} Style</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4">
                      <img
                        src={selectedImage?.url || "/placeholder.svg"}
                        alt={selectedImage?.style}
                        className="w-full h-auto rounded-md"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => downloadImage(
                    image.url,
                    `${image.style.toLowerCase().replace(/\s+/g, "-")}.png`
                  )}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardContent className="p-3">
              <p className="font-medium text-sm truncate">{image.style}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
