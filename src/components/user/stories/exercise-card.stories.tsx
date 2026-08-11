import type { Meta, StoryObj } from "@storybook/react"
import { ExerciseCard, ExerciseCardSkeleton } from "../exercise-card"

const meta = {
  title: "User/ExerciseCard",
  component: ExerciseCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ExerciseCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    exercise: {
      _id: "exercise:1",
      exerciseName: "Bench Press",
      targetSets: 4,
      targetReps: 10,
      targetWeight: 80,
    },
  },
}

export const Heavy: Story = {
  args: {
    exercise: {
      _id: "exercise:2",
      exerciseName: "Deadlift",
      targetSets: 5,
      targetReps: 5,
      targetWeight: 140,
    },
  },
}

export const HighReps: Story = {
  args: {
    exercise: {
      _id: "exercise:3",
      exerciseName: "Dumbbell Curls",
      targetSets: 3,
      targetReps: 15,
      targetWeight: 12,
    },
  },
}

export const LongName: Story = {
  args: {
    exercise: {
      _id: "exercise:4",
      exerciseName: "Incline Dumbbell Chest Press",
      targetSets: 4,
      targetReps: 8,
      targetWeight: 30,
    },
  },
}

export const SkeletonStory: Story = {
  args: {
    exercise: {
      _id: "skeleton",
      exerciseName: "",
      targetSets: 0,
      targetReps: 0,
      targetWeight: 0,
    },
  },
  render: () => <ExerciseCardSkeleton />,
}
