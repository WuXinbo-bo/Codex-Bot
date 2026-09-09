async (page) => {
  await page.goto("http://127.0.0.1:4187/src/index.html");
  await page.evaluate(() => {
    document.getElementById("ball").innerHTML = "";
    const rig = MetaBotM1.create(document.getElementById("ball"), {
      expression: "neutral",
    });
    rig.setMotionLevel("reduced");
  });
  await page
    .locator("#ball")
    .screenshot({
      path: "output/playwright/native-icon.png",
      omitBackground: true,
    });
}
