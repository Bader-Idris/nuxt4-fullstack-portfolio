// TipTap Extensions and Custom Nodes for Enterprise Blog & Comments
import { Mark, Node, Extension, mergeAttributes } from "@tiptap/core";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { BubbleMenu } from "@tiptap/extension-bubble-menu";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Image } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Youtube } from "@tiptap/extension-youtube";
import { CharacterCount } from "@tiptap/extension-character-count";
import { Heading } from "@tiptap/extension-heading";
import { slugify } from "~/utils/slug";

export {
  Underline,
  Underline as MyUnderline,
  Link,
  Link as MyLink,
  Placeholder,
  Placeholder as MyPlaceholder,
  BubbleMenu,
  BubbleMenu as MyBubbleMenu,
  Table,
  Table as MyTable,
  TableRow,
  TableRow as MyTableRow,
  TableCell,
  TableCell as MyTableCell,
  TableHeader,
  TableHeader as MyTableHeader,
  Image,
  Image as MyImage,
  TextAlign,
  TextAlign as MyTextAlign,
  Highlight,
  Highlight as MyHighlight,
  Color,
  Color as MyColor,
  TextStyle,
  TextStyle as MyTextStyle,
  TaskList,
  TaskList as MyTaskList,
  TaskItem,
  TaskItem as MyTaskItem,
  Youtube,
  Youtube as MyYoutube,
  CharacterCount,
  CharacterCount as MyCharacterCount,
  Heading as TipTapHeading,
};

// Custom extension to handle text direction automatically
export const Direction = Extension.create({
  name: "direction",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
          "listItem",
          "callout",
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          dir: {
            default: "auto",
            renderHTML: (attributes) => ({
              dir: attributes.dir || "auto",
            }),
            parseHTML: (element) => element.getAttribute("dir") || "auto",
          },
        },
      },
    ];
  },
});

// Heading with anchor IDs for deep links & Table of Contents
export const MyHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("id"),
        renderHTML: (attributes) => {
          if (!attributes.id) return {};
          return { id: attributes.id };
        },
      },
    };
  },
  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level);
    const level = hasLevel ? node.attrs.level : this.options.levels[0];
    const text = node.textContent || "";
    const generatedId = node.attrs.id || (text ? slugify(text) : undefined);
    return [
      `h${level}`,
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        generatedId ? { id: generatedId } : {}
      ),
      0,
    ];
  },
});

// Spoiler mark with blur reveal effect
export const MySpoiler = Mark.create({
  name: "spoiler",

  addOptions() {
    return {
      HTMLAttributes: {
        class: "tg-spoiler",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (element) =>
          (element as HTMLElement).classList?.contains("tg-spoiler") && null,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setSpoiler:
        () =>
        ({ commands }: any) => {
          return commands.setMark(this.name);
        },
      toggleSpoiler:
        () =>
        ({ commands }: any) => {
          return commands.toggleMark(this.name);
        },
      unsetSpoiler:
        () =>
        ({ commands }: any) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

// Callout / Alert Box Node for enterprise blog tips, warnings, info notes
export const MyCallout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      type: {
        default: "info", // info | tip | warning | danger | note
        parseHTML: (element) => element.getAttribute("data-callout-type") || "info",
        renderHTML: (attributes) => ({
          "data-callout-type": attributes.type,
          class: `blog-callout blog-callout-${attributes.type}`,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout-type]",
      },
      {
        tag: "aside.blog-callout",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attributes?: { type?: string }) =>
        ({ commands }: any) => {
          return commands.wrapIn(this.name, attributes);
        },
      toggleCallout:
        (attributes?: { type?: string }) =>
        ({ commands }: any) => {
          return commands.toggleWrap(this.name, attributes);
        },
      unsetCallout:
        () =>
        ({ commands }: any) => {
          return commands.lift(this.name);
        },
    };
  },
});
