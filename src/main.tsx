import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AppNotificationsProvider } from "./components/ui";
import "./index.css";
import { mantineTheme } from "./theme/mantineTheme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={mantineTheme} defaultColorScheme="light">
      <AppNotificationsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppNotificationsProvider>
    </MantineProvider>
  </React.StrictMode>
);
