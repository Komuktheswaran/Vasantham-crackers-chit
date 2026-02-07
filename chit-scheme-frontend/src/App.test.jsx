import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import * as authService from "./services/authService";

// Mock the authService
jest.mock("./services/authService");

// Mock window.matchMedia for Ant Design
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

test("renders Application title", async () => {
  // Mock the return values for the auth checks
  authService.isAuthenticated.mockResolvedValue(false);
  authService.getUserInfo.mockResolvedValue(null);

  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );

  // Wait for the loading to finish and the title to appear
  const titleElement = await screen.findByText(/Vasantham Crackers World/i);
  expect(titleElement).toBeInTheDocument();
});
