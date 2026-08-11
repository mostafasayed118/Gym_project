import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "../button"

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "gradient",
        "outline",
        "secondary",
        "ghost",
        "destructive",
        "success",
        "warning",
        "link",
      ],
    },
    size: {
      control: "select",
      options: [
        "default",
        "xs",
        "sm",
        "lg",
        "xl",
        "icon",
        "icon-xs",
        "icon-sm",
        "icon-lg",
        "icon-xl",
      ],
    },
    disabled: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: "Button",
  },
}

export const Gradient: Story = {
  args: {
    variant: "gradient",
    children: "Gradient Button",
  },
}

export const Outline: Story = {
  args: {
    variant: "outline",
    children: "Outline Button",
  },
}

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
}

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost Button",
  },
}

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Delete Account",
  },
}

export const Success: Story = {
  args: {
    variant: "success",
    children: "Save Changes",
  },
}

export const Warning: Story = {
  args: {
    variant: "warning",
    children: "Proceed with Caution",
  },
}

export const Link: Story = {
  args: {
    variant: "link",
    children: "Learn More",
  },
}

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
}

export const Large: Story = {
  args: {
    size: "lg",
    children: "Large",
  },
}

export const ExtraLarge: Story = {
  args: {
    size: "xl",
    children: "Extra Large",
  },
}

export const Icon: Story = {
  args: {
    size: "icon",
    children: "💪",
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Disabled",
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="gradient">Gradient</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
}
