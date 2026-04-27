import React from "react";
import { Page } from "@dynatrace/strato-components-preview/layouts";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { Home } from "./pages/Home";
import { Assessment } from "./pages/Assessment";
import { Results } from "./pages/Results";
import { History } from "./pages/History";

export const App = () => {
  return (
    <Page>
      <Page.Header>
        <Header />
      </Page.Header>
      <Page.Main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assess" element={<Assessment />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </Page.Main>
    </Page>
  );
};
