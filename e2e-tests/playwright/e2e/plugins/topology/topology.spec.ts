import { test, expect } from "@playwright/test";
import { Common } from "../../../utils/common";
import { UIhelper } from "../../../utils/ui-helper";
import { Catalog } from "../../../support/pages/catalog";
import { Topology } from "../../../support/pages/topology";

test.describe("Test Topology Plugin", () => {
  let common: Common;
  let uiHelper: UIhelper;
  let catalog: Catalog;
  let topology: Topology;

  test.beforeEach(async ({ page }) => {
    common = new Common(page);
    uiHelper = new UIhelper(page);
    catalog = new Catalog(page);
    topology = new Topology(page);
    await common.loginAsGuest();
  });

  test("Verify pods visibility in the Topology tab", async ({
    page,
  }, testInfo) => {
    // progressively increase test timeout for retries
    test.setTimeout(150000 + testInfo.retry * 30000);
    await catalog.goToBackstageJanusProject();
    await uiHelper.clickTab("Topology");
    await uiHelper.verifyText("backstage-janus");
    await page.getByRole("button", { name: "Fit to Screen" }).click();
    await topology.verifyDeployment("topology-test");
    await uiHelper.verifyButtonURL("Open URL", "topology-test-route", {
      locator: `[data-test-id="topology-test"]`,
    });
    await uiHelper.clickTab("Details");
    await uiHelper.verifyText("Status");
    await uiHelper.verifyText("Active");
    await uiHelper.clickTab("Resources");
    await uiHelper.verifyHeading("Pods");
    await uiHelper.verifyHeading("Services");
    if (await page.getByText("Ingresses").isVisible()) {
      await uiHelper.verifyHeading("Ingresses");
      await uiHelper.verifyText("I");
      await expect(
        page
          .getByTestId("ingress-list")
          .getByRole("link", { name: "topology-test-route" })
          .first(),
      ).toBeVisible();
      await expect(page.locator("pre").first()).toBeVisible();
    } else {
      await uiHelper.verifyHeading("Routes");
      await uiHelper.verifyText("RT");
      await expect(
        page.getByRole("link", { name: "topology-test-route" }).first(),
      ).toBeVisible();
    }
    await uiHelper.verifyText("Location:");
    await expect(page.getByTitle("Deployment")).toBeVisible();
    await uiHelper.verifyText("S");
    await expect(page.locator("rect").first()).toBeVisible();
    await uiHelper.clickTab("Details");
    await page.getByLabel("Pod").hover();
    await page.getByText("Display options").click();
    await page.getByLabel("Pod count").click();
    await uiHelper.verifyText("1");
    await uiHelper.verifyText("Pod");
    // await topology.hoverOnPodStatusIndicator();
    // await uiHelper.verifyTextInTooltip("Running");
    // await uiHelper.verifyText("1Running");
    await uiHelper.verifyButtonURL(
      "Edit source code",
      "https://github.com/janus-idp/backstage-showcase",
    );
    await uiHelper.clickTab("Resources");
    await uiHelper.verifyText("P");
    await expect(page.getByTestId("icon-with-title-Running")).toBeVisible();
    await expect(
      page.getByTestId("icon-with-title-Running").locator("svg"),
    ).toBeVisible();
    await expect(
      page.getByTestId("icon-with-title-Running").getByTestId("status-text"),
    ).toHaveText("Running");
    await uiHelper.verifyHeading("PipelineRuns");
    await uiHelper.verifyText("PL");
    await uiHelper.verifyText("PLR");
    // await expect(async () => {
    //   await page.getByTestId("status-ok").first().click({
    //     force: true,
    //     timeout: 30000,
    //   });
    // }).toPass({
    //   timeout: 30000,
    //   intervals: [1000, 2000, 3000],
    // });
    // await uiHelper.verifyDivHasText(
    //   /Pipeline (Succeeded|Failed|Cancelled|Running)Task/,
    // );
    // await uiHelper.verifyText(/Pipeline (Succeeded|Failed|Cancelled|Running)/);
  });
});
