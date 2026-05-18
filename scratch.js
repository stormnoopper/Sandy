import mermaid from 'mermaid';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><body><div id="test"></div></body>`);
global.window = dom.window;
global.document = dom.window.document;

mermaid.initialize({ startOnLoad: false });

async function test(code) {
  try {
    const { svg } = await mermaid.render('id1', code);
    console.log("SUCCESS:", code.replace(/\n/g, '\\n'));
  } catch (e) {
    console.log("ERROR:", code.replace(/\n/g, '\\n'));
  }
}

async function run() {
  await test(`graph TD;\n  A[Admin] --> B[เข้าสู่ระบบ]`);
  await test(`graph TD;\n  A[Admin] -->|คลิก "ตกลง"| B[เข้าสู่ระบบ]`);
  await test(`graph TD;\n  A[Admin] -->|"คลิก #quot;ตกลง#quot;"| B[เข้าสู่ระบบ]`);
  await test(`graph TD;\n  ระบบ[Admin] --> B[เข้าสู่ระบบ]`);
  await test(`graph TD;\n  A[Admin(1)] --> B[เข้าสู่ระบบ]`);
}
run();
