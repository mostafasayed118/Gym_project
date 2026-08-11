import type { Preview } from "@storybook/react"
import "../src/app/globals.css"

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        {
          name: "dark",
          value: "#0a0a0f",
        },
        {
          name: "light",
          value: "#ffffff",
        },
      ],
    },
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="dark" style={{ minHeight: "100vh", padding: "2rem" }}>
        <Story />
      </div>
    ),
  ],
}

export default preview
