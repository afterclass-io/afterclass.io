import type { Meta, StoryObj } from "@storybook/react";
import { SortableTable } from "./sortable-table";

const meta: Meta<typeof SortableTable> = {
  title: "Common/SortableTable",
  component: SortableTable,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof meta>;

const peopleData = [
  { name: "John", age: 30, city: "New York" },
  { name: "Jane", age: 25, city: "Los Angeles" },
  { name: "Peter", age: 35, city: "Chicago" },
  { name: "Anna", age: 28, city: "Seattle" },
];

const peopleColumns = [
  { key: "name", title: "Name" },
  { key: "age", title: "Age" },
  { key: "city", title: "City" },
];

export const Default: Story = {
  args: {
    data: peopleData,
    columns: peopleColumns,
  },
};

const productData = [
  { product: "Laptop", price: 1200, rating: 4.5 },
  { product: "Mouse", price: 25, rating: 3.8 },
  { product: "Keyboard", price: 75, rating: 4.2 },
  { product: "Monitor", price: 300, rating: 4.7 },
];

const productColumns = [
  { key: "product", title: "Product" },
  { key: "price", title: "Price" },
  { key: "rating", title: "Rating" },
];

export const Products: Story = {
  args: {
    data: productData,
    columns: productColumns,
  },
};