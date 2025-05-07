"use client"

import { useState, useCallback, useEffect } from "react"
import { useDropzone } from "react-dropzone"
import { ImageIcon, Upload, X, Download, ZoomIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import CostEstimator from "./cost-estimator"
import ImageGallery from "./image-gallery"
import { toast } from "sonner"

// Backend API URL - use environment variable with fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Define quality options
const qualityOptions = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

// Define size options
const sizeOptions = [
  { value: "square", label: "Square (1024x1024)", width: 1024, height: 1024 },
  { value: "portrait", label: "Portrait (1024x1536)", width: 1024, height: 1536 },
  { value: "landscape", label: "Landscape (1536x1024)", width: 1536, height: 1024 },
]

// Interface for the style objects from the backend
interface Style {
  label: string
  style_id: string
  prompt: string
}

// Interface for the generated image response
interface GeneratedImage {
  style: string
  style_id: string
  url: string
  timestamp: string
  processing_time: number
}

// Interface for API response
interface ApiResponse {
  images: GeneratedImage[];
  original_image: string;
  total_cost: number;
  generation_time: number;
}

// Interface for history item
interface HistoryItem {
  id: string;
  timestamp: string;
  request: {
    styles: string[];
    quality: string;
    size: string;
  };
  response: {
    images: GeneratedImage[];
    original_image: string;
    total_cost: number;
    generation_time: number;
  };
}

// Interface for history response
interface HistoryResponse {
  generations: HistoryItem[];
}

// Update the pending task interface
interface PendingTask {
  style: string;
  pending: boolean;
  url?: string;
}

// HistoryTab component for displaying generation history
function HistoryTab() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        console.log("Fetching history from:", `${API_URL}/history`);
        const response = await fetch(`${API_URL}/history`);
        console.log("History response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`Error fetching history: ${response.statusText}`);
        }
        
        const data: HistoryResponse = await response.json();
        console.log("History data received:", data);
        setHistory(data.generations);
      } catch (error) {
        console.error("Failed to fetch history:", error);
        setError("Failed to load generation history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Format the timestamp for display
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

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
        const fullUrl = url.startsWith('/') ? `${API_URL}${url}` : url;
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

  // Download all images from a generation
  const downloadAllImagesFromGeneration = (item: HistoryItem) => {
    // Start with notifying the user
    toast.info("Starting download of all images...");
    
    // Download original image
    downloadImage(
      `${API_URL}${item.response.original_image}`, 
      `original-${item.id.substring(0, 8)}.png`
    );
    
    // Download all transformed images
    item.response.images.forEach((image, index) => {
      setTimeout(() => {
        downloadImage(
          `${API_URL}${image.url}`, 
          `${image.style.toLowerCase().replace(/\s+/g, "-")}-${item.id.substring(0, 8)}.png`
        );
      }, (index + 1) * 500); // Stagger downloads to avoid browser limitations
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500 dark:text-slate-400">No generation history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Generation History</h2>
      
      <div className="space-y-8">
        {history.map((item) => {
          console.log("Rendering history item:", item.id);
          console.log("Original image path:", item.response.original_image);
          console.log("Generated images:", item.response.images);
          
          return (
          <Card key={item.id} className="overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Generation {item.id.substring(0, 8)}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-slate-500">{formatTimestamp(item.timestamp)}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadAllImagesFromGeneration(item)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download All
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.request.styles.map((style) => (
                  <Badge key={style} variant="outline">{style}</Badge>
                ))}
                <Badge variant="secondary">{item.request.quality} quality</Badge>
                <Badge variant="secondary">{item.request.size}</Badge>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Card className="overflow-hidden">
                  <div className="relative group">
                    <img
                      src={`${API_URL}${item.response.original_image}`}
                      alt="Original"
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        // Fallback for image loading errors
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = "/placeholder.svg";
                        console.error(`Failed to load original image: ${API_URL}${item.response.original_image}`);
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={() => downloadImage(
                          `${API_URL}${item.response.original_image}`, 
                          `original-${item.id.substring(0, 8)}.png`
                        )}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">Original Image</p>
                  </CardContent>
                </Card>
                
                {item.response.images.map((image) => (
                  <Card key={image.style_id} className="overflow-hidden">
                    <div className="relative group">
                      <img
                        src={`${API_URL}${image.url}`}
                        alt={`${image.style} style`}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          // Fallback for image loading errors
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = "/placeholder.svg";
                          console.error(`Failed to load image: ${API_URL}${image.url}`);
                        }}
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="secondary" size="icon">
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>{image.style} Style</DialogTitle>
                            </DialogHeader>
                            <div className="mt-4">
                              <img
                                src={`${API_URL}${image.url}`}
                                alt={image.style}
                                className="w-full h-auto rounded-md"
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => downloadImage(
                            `${API_URL}${image.url}`, 
                            `${image.style.toLowerCase().replace(/\s+/g, "-")}-${item.id.substring(0, 8)}.png`
                          )}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{image.style}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                <p>Total cost: ${item.response.total_cost.toFixed(3)}</p>
                <p>Processing time: {item.response.generation_time.toFixed(1)}s</p>
              </div>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function ImageTransformer() {
  // State for the uploaded image
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [originalFile, setOriginalFile] = useState<File | null>(null)

  // State for available styles
  const [styles, setStyles] = useState<Style[]>([])
  const [loadingStyles, setLoadingStyles] = useState<boolean>(true)

  // State for selected options
  const [selectedStyles, setSelectedStyles] = useState<string[]>([])
  const [quality, setQuality] = useState<string>("auto")
  const [size, setSize] = useState<string>("square")

  // State for generation process
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)

  // State for generated images
  const [generatedImages, setGeneratedImages] = useState<Array<{ style: string; url: string }>>([])
  // State for tasks in progress
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("upload")
  
  // Fetch available styles from the backend
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        setLoadingStyles(true)
        const response = await fetch(`${API_URL}/styles`)
        if (!response.ok) {
          throw new Error(`Error fetching styles: ${response.statusText}`)
        }
        const data = await response.json()
        setStyles(data)
      } catch (error) {
        console.error("Failed to fetch styles:", error)
        toast.error("Failed to load transformation styles")
      } finally {
        setLoadingStyles(false)
      }
    }

    fetchStyles()
  }, [])

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setFileName(file.name)
      setOriginalFile(file)

      const reader = new FileReader()
      reader.onload = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxFiles: 1,
  })

  // Handle style selection
  const toggleStyle = (style: string) => {
    setSelectedStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))
  }

  // Handle generation
  const handleGenerate = async () => {
    if (!uploadedImage || selectedStyles.length === 0 || !originalFile) return;

    setIsGenerating(true);
    setProgress(0);
    
    // Initialize pending tasks for each selected style
    const initialPendingTasks = selectedStyles.map(style => ({ style, pending: true } as PendingTask));
    setPendingTasks(initialPendingTasks);
    setGeneratedImages([]); // Clear previous results
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', originalFile);
      selectedStyles.forEach(style => {
        formData.append('styles', style);
      });
      formData.append('quality', quality);
      formData.append('size', size);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 90)); // Cap at 90% until we get real results
      }, 300);
      
      // Send to backend
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate images');
      }
      
      // Process results
      const data = await response.json() as ApiResponse;
      
      // Format images with full URLs
      const formattedImages = data.images.map((img) => ({
        style: img.style,
        url: `${API_URL}${img.url}`
      }));
      
      // Update generated images - this will also update the image gallery
      setGeneratedImages(formattedImages);
      
      // Update pending tasks to reflect completed ones
      const completedStyles = formattedImages.map(img => img.style);
      
      // Create mapping of style to image URL for easy lookup
      const styleToImageMap = formattedImages.reduce((acc, img) => {
        acc[img.style] = img.url;
        return acc;
      }, {} as Record<string, string>);
      
      const updatedPendingTasks = pendingTasks.map(task => {
        const isCompleted = completedStyles.includes(task.style);
        return {
          ...task,
          pending: !isCompleted,
          url: isCompleted ? styleToImageMap[task.style] : undefined
        };
      });
      
      setPendingTasks(updatedPendingTasks);
      setProgress(100);
      
      // Show success message
      toast.success(`Successfully generated ${formattedImages.length} images!`);
      
      // Switch to results tab
      setActiveTab("results");
      
    } catch (error) {
      console.error('Error generating images:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate images');
    } finally {
      setIsGenerating(false);
    }
  };

  // Clear the uploaded image
  const clearImage = () => {
    setUploadedImage(null)
    setFileName("")
    setOriginalFile(null)
  }

  // Get the current size dimensions
  const getCurrentSize = () => {
    return sizeOptions.find((option) => option.value === size) || sizeOptions[0]
  }

  return (
    <div className="space-y-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload & Configure</TabsTrigger>
          <TabsTrigger value="results" disabled={generatedImages.length === 0}>
            Results
          </TabsTrigger>
          <TabsTrigger value="history">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6 pt-4">
          {/* Image Upload Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Upload Image</h2>

            {!uploadedImage ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-slate-300 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <ImageIcon className="h-10 w-10 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Drag & drop your image here
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">or click to browse files</p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <img
                  src={uploadedImage || "/placeholder.svg"}
                  alt="Uploaded"
                  className="w-full h-auto max-h-[300px] object-contain bg-slate-100 dark:bg-slate-800"
                />
                <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={clearImage}>
                  <X className="h-4 w-4" />
                </Button>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium truncate">{fileName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Transformation Options */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Transformation Options</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-3 text-slate-800 dark:text-slate-200">Transformation Styles</h3>
                  
                  {loadingStyles ? (
                    <div className="flex justify-center items-center py-8">
                      <p className="text-sm text-slate-500">Loading styles...</p>
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="h-[220px] pr-4">
                        <div className="space-y-3">
                          {styles.map((style) => (
                            <div key={style.style_id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`style-${style.style_id}`}
                                checked={selectedStyles.includes(style.label)}
                                onCheckedChange={() => toggleStyle(style.label)}
                              />
                              <Label
                                htmlFor={`style-${style.style_id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {style.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedStyles.length > 0 ? (
                          selectedStyles.map((style) => (
                            <Badge key={style} variant="secondary" className="text-xs">
                              {style}
                              <button className="ml-1 hover:text-destructive" onClick={() => toggleStyle(style)}>
                                ×
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">No styles selected</p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="quality">Quality</Label>
                        <Select value={quality} onValueChange={setQuality}>
                          <SelectTrigger id="quality">
                            <SelectValue placeholder="Select quality" />
                          </SelectTrigger>
                          <SelectContent>
                            {qualityOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="size">Size</Label>
                        <Select value={size} onValueChange={setSize}>
                          <SelectTrigger id="size">
                            <SelectValue placeholder="Select size" />
                          </SelectTrigger>
                          <SelectContent>
                            {sizeOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <CostEstimator quality={quality} size={size} numImages={selectedStyles.length} />
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              disabled={!uploadedImage || selectedStyles.length === 0 || isGenerating}
              onClick={handleGenerate}
              className="w-full sm:w-auto"
            >
              {isGenerating ? "Generating..." : "Generate Images"}
            </Button>
          </div>

          {/* Progress Bar and Task Status */}
          {isGenerating && (
            <div className="space-y-4">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                Generating {selectedStyles.length} image{selectedStyles.length !== 1 ? "s" : ""}...
              </p>
              
              {/* Task Queue Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                {pendingTasks.map((task) => (
                  <Card key={task.style} className={`overflow-hidden ${!task.pending ? 'border-green-500' : 'border-amber-500'}`}>
                    <div className="relative">
                      {task.pending ? (
                        <div className="flex items-center justify-center h-40 bg-slate-100 dark:bg-slate-800">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                        </div>
                      ) : (
                        <img 
                          src={task.url || "/placeholder.svg"} 
                          alt={`${task.style} style`}
                          className="w-full h-40 object-cover"
                        />
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-sm truncate">{task.style}</p>
                        {task.pending ? (
                          <span className="text-xs text-amber-500">Processing...</span>
                        ) : (
                          <span className="text-xs text-green-500">Complete</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="results" className="pt-4">
          <ImageGallery images={generatedImages} />
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
