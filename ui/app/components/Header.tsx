import React from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@dynatrace/strato-components-preview/layouts";

export const Header = () => {
  return (
    <AppHeader>
      <AppHeader.NavItems>
        <AppHeader.AppNavLink as={Link} to="/" />
        <AppHeader.NavItem as={Link} to="/">
          Home
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/assess">
          Assessment
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/results">
          Results
        </AppHeader.NavItem>
        <AppHeader.NavItem as={Link} to="/history">
          History
        </AppHeader.NavItem>
      </AppHeader.NavItems>
    </AppHeader>
  );
};
