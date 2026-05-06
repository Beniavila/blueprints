import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { BlueprintNode } from "./BlueprintNode";
import { PARENT_LAYOUT } from "../constants/layout";

function buildParentNode() {
  return {
    id: "parent-1",
    type: "parent",
    parentId: null,
    title: "Parent",
    x: 100,
    y: 100,
    w: 500,
    h: 420,
    notes: "Parent notes",
    items: []
  };
}

function buildChildNode() {
  return {
    id: "child-1",
    type: "child",
    parentId: "parent-1",
    title: "Mini 1",
    x: 16,
    y: 16,
    w: 160,
    h: 88,
    notes: "Mini notes"
  };
}

describe("BlueprintNode", () => {
  function getChildSurface() {
    return screen.getByText("Mini notes").closest("div[data-interactive='true']");
  }

  it("connects a child node on pointerdown when connect mode is active", () => {
    const onConnectClick = vi.fn();
    const onStartDrag = vi.fn();

    render(
      <BlueprintNode
        node={buildParentNode()}
        children={[buildChildNode()]}
        selectedIds={[]}
        connectMode={true}
        connectSource={null}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onStartDrag={onStartDrag}
        onStartResize={vi.fn()}
        onConnectClick={onConnectClick}
      />
    );

    fireEvent.pointerDown(getChildSurface(), {
      button: 0,
      clientX: 10,
      clientY: PARENT_LAYOUT.childAreaTop + 10,
    });

    expect(onConnectClick).toHaveBeenCalledWith("child-1");
    expect(onStartDrag).not.toHaveBeenCalled();
  });

  it("starts dragging a child node when connect mode is disabled", () => {
    const onStartDrag = vi.fn();

    render(
      <BlueprintNode
        node={buildParentNode()}
        children={[buildChildNode()]}
        selectedIds={[]}
        connectMode={false}
        connectSource={null}
        onSelect={vi.fn()}
        onUpdate={vi.fn()}
        onStartDrag={onStartDrag}
        onStartResize={vi.fn()}
        onConnectClick={vi.fn()}
      />
    );

    fireEvent.pointerDown(getChildSurface(), {
      button: 0,
      clientX: 10,
      clientY: PARENT_LAYOUT.childAreaTop + 10,
    });

    expect(onStartDrag).toHaveBeenCalled();
  });
});
