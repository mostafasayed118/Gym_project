"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { Camera, ChevronRight, ChevronLeft, Check, Scale, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Id } from "@convex/_generated/dataModel"

interface WeeklyCheckinFormProps {
  userId: Id<"users">
  onComplete?: () => void
}

const STEPS = ["Photos", "Measurements", "Notes"] as const

export function WeeklyCheckinForm({ userId, onComplete }: WeeklyCheckinFormProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [photos, setPhotos] = React.useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = React.useState<string[]>([])
  const [weight, setWeight] = React.useState("")
  const [bodyFat, setBodyFat] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const generateUploadUrl = useMutation(api.checkins.generateUploadUrl)
  const submitCheckin = useMutation(api.checkins.submitCheckin)

  const handlePhotoSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    // Limit to 4 photos
    const selected = files.slice(0, 4)
    setPhotos((prev) => [...prev, ...selected].slice(0, 4))

    // Create preview URLs
    const newUrls = selected.map((file) => URL.createObjectURL(file))
    setPhotoPreviewUrls((prev) => [...prev, ...newUrls].slice(0, 4))
  }, [])

  const removePhoto = React.useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviewUrls((prev) => {
      const url = prev[index]
      if (url) URL.revokeObjectURL(url)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  /**
   * Upload all selected photos. Returns `{ ids, failedCount }` so the caller
   * can decide whether to proceed with a partial submission. Closes BUG-048
   * where a partial failure produced N error toasts AND a success toast,
   * and the check-in was silently submitted with a truncated photo list.
   */
  const handleUpload = React.useCallback(async (): Promise<{
    ids: Id<"_storage">[]
    failedCount: number
  }> => {
    const ids: Id<"_storage">[] = []
    let failedCount = 0

    for (const photo of photos) {
      try {
        const url = await generateUploadUrl()
        const response = await fetch(url, {
          method: "POST",
          body: photo,
          // `photo.type` is always a string (empty string for unknown MIME);
          // use `||` so iOS HEIC uploads with empty type fall through to a
          // sensible default. Closes BUG-018 (frontend audit).
          headers: { "Content-Type": photo.type || "image/jpeg" },
        })
        if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
        const { storageId } = await response.json()
        ids.push(storageId)
      } catch (err) {
        console.error("Photo upload failed:", err)
        failedCount++
      }
    }

    return { ids, failedCount }
  }, [photos, generateUploadUrl])

  const handleSubmit = React.useCallback(async () => {
    setIsSubmitting(true)
    try {
      const { ids: storageIds, failedCount } = await handleUpload()

      // Fail-loud on partial photo upload — don't silently truncate the photo
      // set and then claim success. (Closes BUG-048.)
      if (failedCount > 0) {
        toast.error(
          `${failedCount} of ${photos.length} photo${photos.length === 1 ? "" : "s"} failed to upload. Please retry.`,
        )
        setIsSubmitting(false)
        return
      }

      // Get current week number
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const weekNumber = Math.ceil(
        ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
      )

      await submitCheckin({
        userId,
        weekNumber,
        weight: weight ? parseFloat(weight) : undefined,
        bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
        notes: notes || undefined,
        photoStorageIds: storageIds,
      })

      toast.success("Check-in submitted!")
      onComplete?.()
    } catch {
      toast.error("Failed to submit check-in")
    } finally {
      setIsSubmitting(false)
    }
  }, [handleUpload, photos.length, userId, weight, bodyFat, notes, submitCheckin, onComplete])

  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case 0:
        return true // Photos are optional
      case 1:
        return weight !== "" || bodyFat !== "" // At least one measurement
      case 2:
        return true // Notes are optional
      default:
        return false
    }
  }, [currentStep, weight, bodyFat])

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Progress indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((step, i) => (
          <React.Fragment key={step}>
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all",
                i < currentStep
                  ? "bg-primary text-primary-foreground"
                  : i === currentStep
                    ? "bg-primary/20 text-primary ring-2 ring-primary"
                    : "bg-zinc-800 text-muted-foreground",
              )}
            >
              {i < currentStep ? <Check className="size-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 rounded-full transition-all",
                  i < currentStep ? "bg-primary" : "bg-zinc-800",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step labels */}
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
        </p>
      </div>

      {/* Step content */}
      <Card className="border-zinc-800/80 bg-zinc-900/50 backdrop-blur-xl">
        <CardContent className="p-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="text-center">
                <Camera className="mx-auto mb-2 size-8 text-muted-foreground" />
                <h3 className="text-lg font-bold">Progress Photos</h3>
                <p className="text-sm text-muted-foreground">
                  Take front, side, and back photos for best comparison
                </p>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-2 gap-3">
                {photoPreviewUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs can't go through next/image's server-side optimizer */}
                    <img src={url} alt={`Progress ${i + 1}`} className="size-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {photos.length < 4 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 transition-colors hover:border-primary/50 hover:bg-zinc-800/50">
                    <Camera className="mb-1 size-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Add Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-center">
                <Scale className="mx-auto mb-2 size-8 text-muted-foreground" />
                <h3 className="text-lg font-bold">Measurements</h3>
                <p className="text-sm text-muted-foreground">
                  Log your current weight and body fat percentage
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="weight" className="text-sm">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="e.g. 75.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bodyFat" className="text-sm">Body Fat %</Label>
                  <Input
                    id="bodyFat"
                    type="number"
                    placeholder="e.g. 15.2"
                    value={bodyFat}
                    onChange={(e) => setBodyFat(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center">
                <FileText className="mx-auto mb-2 size-8 text-muted-foreground" />
                <h3 className="text-lg font-bold">Notes</h3>
                <p className="text-sm text-muted-foreground">
                  Any notes for your coach about this week
                </p>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling? Any changes in diet, sleep, or energy?"
                rows={4}
                className="w-full resize-none rounded-xl border border-zinc-800/80 bg-zinc-800/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => s - 1)}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button
            onClick={() => setCurrentStep((s) => s + 1)}
            disabled={!canProceed}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            variant="gradient"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Check-in"}
            {!isSubmitting && <Check className="size-4" />}
          </Button>
        )}
      </div>
    </div>
  )
}
