// Read the docs: https://nuxt-tiptap-editor.vercel.app/docs/extensions#importing
// Note: TiptapImage is already provided by @nuxt/ui's tiptap integration
// export { Image as TiptapImage } from '@tiptap/extension-image';
// export { Youtube as TiptapYoutube } from '@tiptap/extension-youtube';
// export { Underline as TiptapUnderline } from '@tiptap/extension-text-align';
// export { TextAlign as TiptapTextAlign } from '@tiptap/extension-text-align';
// export { Placeholder as TiptapPlaceholder } from '@tiptap/extension-placeholder';
// export { CharacterCount as TiptapCharacterCount } from '@tiptap/extension-character-count';

import { Mark, mergeAttributes } from '@tiptap/core'

export { Underline as MyUnderline } from '@tiptap/extension-underline';
export { Link as MyLink } from '@tiptap/extension-link';
export { Placeholder as MyPlaceholder } from '@tiptap/extension-placeholder';
export { BubbleMenu as MyBubbleMenu } from '@tiptap/extension-bubble-menu';

export const MySpoiler = Mark.create({
  name: 'spoiler',

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'tg-spoiler',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: element => (element as HTMLElement).classList.contains('tg-spoiler') && null,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setSpoiler: () => ({ commands }: any) => {
        return commands.setMark(this.name)
      },
      toggleSpoiler: () => ({ commands }: any) => {
        return commands.toggleMark(this.name)
      },
      unsetSpoiler: () => ({ commands }: any) => {
        return commands.unsetMark(this.name)
      },
    }
  },
})
