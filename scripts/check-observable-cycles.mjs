#!/usr/bin/env node
// Fail after `observable build` when emitted cells contain a dependency cycle.
// Framework validates syntax and links but leaves cycles for the browser runtime,
// where they render as `RuntimeError: circular definition` and blank downstream cells.

import {readdirSync, readFileSync} from "node:fs";
import {join} from "node:path";

const dist = process.argv[2] ?? "dist";
const pages = readdirSync(dist).filter(file => file.endsWith(".html"));
const failures = [];

for (const page of pages) {
  const cells = [];
  for (const line of readFileSync(join(dist, page), "utf8").split(/\r?\n/)) {
    const header = line.match(/^define\(\{id: "([^"]+)"(.*), body:/);
    if (!header) continue;
    const inputs = header[2].match(/inputs: (\[[^\]]*\])/);
    const outputs = header[2].match(/outputs: (\[[^\]]*\])/);
    cells.push({
      id: header[1],
      inputs: inputs ? JSON.parse(inputs[1]) : [],
      outputs: outputs ? JSON.parse(outputs[1]) : []
    });
  }

  const producers = new Map();
  cells.forEach((cell, index) => {
    for (const output of cell.outputs) {
      const indexes = producers.get(output) ?? [];
      indexes.push(index);
      producers.set(output, indexes);
    }
  });
  const dependencies = cells.map(() => []);
  cells.forEach((cell, index) => {
    for (const input of cell.inputs) {
      dependencies[index].push(...(producers.get(input) ?? []));
    }
  });

  let nextIndex = 0;
  const indexes = Array(cells.length).fill(-1);
  const lowLinks = Array(cells.length).fill(-1);
  const stack = [];
  const onStack = new Set();

  function visit(node) {
    indexes[node] = lowLinks[node] = nextIndex++;
    stack.push(node);
    onStack.add(node);
    for (const dependency of dependencies[node]) {
      if (indexes[dependency] < 0) {
        visit(dependency);
        lowLinks[node] = Math.min(lowLinks[node], lowLinks[dependency]);
      } else if (onStack.has(dependency)) {
        lowLinks[node] = Math.min(lowLinks[node], indexes[dependency]);
      }
    }
    if (lowLinks[node] !== indexes[node]) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    if (component.length > 1 || dependencies[node].includes(node)) {
      failures.push({page, cells: component.map(index => cells[index])});
    }
  }

  cells.forEach((_, index) => {
    if (indexes[index] < 0) visit(index);
  });
}

console.log(`check-observable-cycles: scanned ${pages.length} built page(s).`);
if (!failures.length) {
  console.log("check-observable-cycles: OK — no circular cell definitions.");
  process.exit(0);
}

console.error("check-observable-cycles: FAILED — circular cell definitions found.");
for (const failure of failures) {
  console.error(`\n${failure.page}`);
  for (const cell of failure.cells) {
    console.error(`  ${cell.id}: inputs=[${cell.inputs.join(", ")}] outputs=[${cell.outputs.join(", ")}]`);
  }
}
process.exit(1);
