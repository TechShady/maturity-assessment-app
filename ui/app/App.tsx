import React from "react";
import { Page } from "@dynatrace/strato-components-preview/layouts";
import { Route, Routes } from "react-router-dom";
import { Header } from "./components/Header";
import { TabBar } from "./components/Header";
import "./styles/theme.css";
import { CustomerBanner } from "./components/CustomerBanner";
import { CustomerNameProvider } from "./CustomerNameContext";
import { Home } from "./pages/Home";
import { DynatraceAssessment } from "./pages/DynatraceAssessment";
import { PersonalGrowthAssessment } from "./pages/PersonalGrowthAssessment";
import { Results } from "./pages/Results";
import { DtHistory } from "./pages/DtHistory";
import { PersonalHistory } from "./pages/PersonalHistory";
import { DtInsights } from "./pages/DtInsights";
import { PersonalInsights } from "./pages/PersonalInsights";
import { DtExecutive } from "./pages/DtExecutive";
import { PersonalExecutive } from "./pages/PersonalExecutive";
import { CoverageGap } from "./pages/CoverageGap";
import { RiskAssessment } from "./pages/RiskAssessment";
import { ROICalculator } from "./pages/ROICalculator";
import { WhatIf } from "./pages/WhatIf";
import { AdoptionRoadmap } from "./pages/AdoptionRoadmap";
import { AccountHealth } from "./pages/AccountHealth";
import { QBRExport } from "./pages/QBRExport";
import { PlatformUsage } from "./pages/PlatformUsage";
import { Help } from "./pages/Help";

export const App = () => {
  return (
    <CustomerNameProvider>
      <Page>
        <Page.Header>
          <Header />
        </Page.Header>
        <Page.Main>
          <CustomerBanner />
          <TabBar />
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/assess/dynatrace" element={<DynatraceAssessment />} />
          <Route path="/assess/personal" element={<PersonalGrowthAssessment />} />
          <Route path="/results" element={<Results />} />
          <Route path="/history/dt" element={<DtHistory />} />
          <Route path="/history/personal" element={<PersonalHistory />} />
          <Route path="/insights/dt" element={<DtInsights />} />
          <Route path="/insights/personal" element={<PersonalInsights />} />
          <Route path="/executive/dt" element={<DtExecutive />} />
          <Route path="/executive/personal" element={<PersonalExecutive />} />
          <Route path="/coverage" element={<CoverageGap />} />
          <Route path="/risk" element={<RiskAssessment />} />
          <Route path="/roi" element={<ROICalculator />} />
          <Route path="/whatif" element={<WhatIf />} />
          <Route path="/roadmap" element={<AdoptionRoadmap />} />
          <Route path="/health" element={<AccountHealth />} />
          <Route path="/qbr" element={<QBRExport />} />
          <Route path="/platform" element={<PlatformUsage />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </Page.Main>
    </Page>
    </CustomerNameProvider>
  );
};
