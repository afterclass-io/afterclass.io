import type { Meta, StoryObj } from "@storybook/nextjs";

import { Combobox } from "./Combobox";

const exampleListObj = [
  "Megan Figueroa",
  "Spencer Randolph",
  "Kailey Xiong",
  "Azrael Powers",
  "Michelle Madden",
  "Everest Fuentes",
  "Madeleine Weiss",
  "Koa Nicholson",
  "Justice Hamilton",
  "Jason Choi",
  "Karla Freeman",
  "Jayce Yoder",
  "Emerie Wheeler",
  "Kenneth Cano",
  "Egypt Boyle",
  "Robin Hahn",
  "Fallon Stevenson",
  "Callan Flores",
  "Emilia Barnes",
  "Damian Person",
  "Dylan Lin",
  "Conor Chang",
  "Ophelia Farmer",
  "Jamison Coleman",
  "Julia Fields",
  "Clayton Hutchinson",
  "Jamie Fletcher",
  "Jay Adams",
  "Stella Warren",
  "Abel Clayton",
  "Saige Banks",
  "Martin Dennis",
  "Maisie Gardner",
  "Alan Spence",
  "Aislinn Aguirre",
  "Andy Zamora",
  "Sierra Mays",
  "Jadiel Tanner",
  "Harmoni Arellano",
].map((el) => ({
  value: el.toLowerCase(),
  label: el,
}));

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Common/Combobox",
  component: Combobox,
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ["autodocs"],
  args: {
    placeholder: "Search for a Prof...",
    triggerLabel: "Select a Prof",
    items: exampleListObj,
  },
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
