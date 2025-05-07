import { Card, CardContent } from "@/components/ui/card"
import { InfoIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface CostEstimatorProps {
  quality: string
  size: string
  numImages: number
}

// Pricing constants based on the latest OpenAI pricing
const PRICING = {
  low: 0.011,
  medium: 0.042,
  high: 0.167,
  auto: 0.042, // Default to medium for auto
}

export default function CostEstimator({ quality, size, numImages }: CostEstimatorProps) {
  // Calculate cost based on quality and size
  const getBaseCost = () => {
    let baseCost = PRICING.medium; // Default base cost (medium)

    // Adjust for quality - updated pricing structure
    switch (quality) {
      case "low":
        baseCost = PRICING.low;
        break;
      case "medium":
        baseCost = PRICING.medium;
        break;
      case "high":
        baseCost = PRICING.high;
        break;
      default:
        baseCost = PRICING.auto; // Auto - same as medium
    }

    // Adjust for size
    switch (size) {
      case "square":
        // No adjustment for square
        break;
      case "portrait":
      case "landscape":
        baseCost *= 1.5; // 50% more for non-square
        break;
    }

    return baseCost;
  }

  const baseCost = getBaseCost();
  const totalCost = numImages > 0 ? (baseCost * numImages).toFixed(3) : "0.000";
  const costPerImage = baseCost.toFixed(3);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Cost Estimate</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400">
                  <InfoIcon className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-[200px]">
                  OpenAI pricing: Low: ${PRICING.low}, Medium: ${PRICING.medium}, High: ${PRICING.high} per image. Non-square sizes have a 50% surcharge.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Cost per image:</span>
            <span className="font-medium">${costPerImage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Number of images:</span>
            <span className="font-medium">{numImages}</span>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 mt-2 flex justify-between">
            <span className="font-medium">Total estimated cost:</span>
            <span className="font-bold text-primary">${totalCost}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
