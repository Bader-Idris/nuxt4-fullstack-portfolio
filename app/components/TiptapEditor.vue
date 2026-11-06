<template>
  <div
    ref="editorContainerRef"
    class="tiptap-editor-wrapper"
    :class="[
      `variant-${variant}`,
      {
        'is-focused': isFocused,
        'is-fullscreen': isFullscreen,
      },
    ]"
    dir="auto"
  >
    <!-- Full Enterprise Sticky Toolbar with Combined UI Options -->
    <header v-if="variant === 'enterprise'" class="tiptap-toolbar" @mousedown.prevent>
      <!-- History Group -->
      <div class="toolbar-group">
        <button
          type="button"
          class="toolbar-btn"
          title="Undo (Ctrl+Z)"
          :disabled="!editor?.can().undo()"
          @click="editor?.chain().focus().undo().run()"
        >
          <Icon name="material-symbols:undo" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Redo (Ctrl+Y)"
          :disabled="!editor?.can().redo()"
          @click="editor?.chain().focus().redo().run()"
        >
          <Icon name="material-symbols:redo" />
        </button>
      </div>

      <div class="toolbar-divider" />

      <!-- Heading / Block Selector Dropdown -->
      <div class="toolbar-group dropdown-wrapper">
        <button
          type="button"
          class="toolbar-btn select-btn"
          title="Text Style / Heading Level"
          :class="{ 'is-active': activeDropdown === 'heading' || editor?.isActive('heading') }"
          @click="toggleDropdown('heading')"
        >
          <span>{{ currentBlockLabel }}</span>
          <Icon name="material-symbols:arrow-drop-down" class="dropdown-arrow-icon" />
        </button>

        <div v-if="activeDropdown === 'heading'" class="toolbar-dropdown-menu heading-dropdown-menu">
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('paragraph') && !editor?.isActive('heading') }"
            @click="editor?.chain().focus().setParagraph().run(); closeAllDropdowns()"
          >
            <span class="label-badge">¶</span> Normal Paragraph
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 1 }).run(); closeAllDropdowns()"
          >
            <span class="label-badge">H1</span> Heading 1
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 2 }).run(); closeAllDropdowns()"
          >
            <span class="label-badge">H2</span> Heading 2
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 3 }).run(); closeAllDropdowns()"
          >
            <span class="label-badge">H3</span> Heading 3
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('heading', { level: 4 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 4 }).run(); closeAllDropdowns()"
          >
            <span class="label-badge">H4</span> Heading 4
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('heading', { level: 5 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 5 }).run(); closeAllDropdowns()"
          >
            <span class="label-badge">H5</span> Heading 5
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('heading', { level: 6 }) }"
            @click="editor?.chain().focus().toggleHeading({ level: 6 }).run(); closeAllDropdowns()"
          >
            <span class="label-badge">H6</span> Heading 6
          </button>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- Typography Marks + More Formatting Dropdown -->
      <div class="toolbar-group">
        <button
          type="button"
          class="toolbar-btn"
          title="Bold (Ctrl+B)"
          :class="{ 'is-active': editor?.isActive('bold') }"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <Icon name="material-symbols:format-bold" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Italic (Ctrl+I)"
          :class="{ 'is-active': editor?.isActive('italic') }"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <Icon name="material-symbols:format-italic" />
        </button>
        <button
          type="button"
          class="toolbar-btn"
          title="Underline (Ctrl+U)"
          :class="{ 'is-active': editor?.isActive('underline') }"
          @click="editor?.chain().focus().toggleUnderline().run()"
        >
          <Icon name="material-symbols:format-underlined" />
        </button>

        <!-- More Formatting Dropdown (Strike, Code, Spoiler, Clear) -->
        <div class="dropdown-wrapper">
          <button
            type="button"
            class="toolbar-btn dropdown-btn"
            title="More Formatting Options"
            :class="{ 'is-active': isMoreFormatActive || activeDropdown === 'moreFormat' }"
            @click="toggleDropdown('moreFormat')"
          >
            <Icon name="material-symbols:more-horiz" />
          </button>

          <div v-if="activeDropdown === 'moreFormat'" class="toolbar-dropdown-menu">
            <button
              type="button"
              :class="{ 'is-active': editor?.isActive('strike') }"
              @click="editor?.chain().focus().toggleStrike().run(); closeAllDropdowns()"
            >
              <Icon name="material-symbols:format-strikethrough" /> Strikethrough
            </button>
            <button
              type="button"
              :class="{ 'is-active': editor?.isActive('code') }"
              @click="editor?.chain().focus().toggleCode().run(); closeAllDropdowns()"
            >
              <Icon name="material-symbols:code" /> Inline Code
            </button>
            <button
              type="button"
              :class="{ 'is-active': editor?.isActive('spoiler') }"
              @click="editor?.chain().focus().toggleSpoiler().run(); closeAllDropdowns()"
            >
              <Icon name="material-symbols:visibility-off" /> Spoiler (Blur)
            </button>
            <div class="dropdown-item-divider" />
            <button
              type="button"
              @click="editor?.chain().focus().clearNodes().unsetAllMarks().run(); closeAllDropdowns()"
            >
              <Icon name="material-symbols:format-clear" /> Clear Formatting
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- Color & Highlight Pickers -->
      <div class="toolbar-group color-pickers-group">
        <div class="dropdown-wrapper">
          <button
            type="button"
            class="toolbar-btn"
            title="Text Color"
            :class="{ 'is-active': activeDropdown === 'color' }"
            @click="toggleDropdown('color')"
          >
            <Icon name="material-symbols:format-color-text" />
          </button>
          <div v-if="activeDropdown === 'color'" class="color-palette-popover">
            <div class="palette-grid">
              <button
                v-for="c in textColors"
                :key="c.name"
                type="button"
                class="color-swatch"
                :style="{ backgroundColor: c.value }"
                :title="c.name"
                @click="applyTextColor(c.value)"
              />
            </div>
            <button type="button" class="clear-swatch-btn" @click="applyTextColor('')">
              Default Color
            </button>
          </div>
        </div>

        <div class="dropdown-wrapper">
          <button
            type="button"
            class="toolbar-btn"
            title="Highlight Color"
            :class="{ 'is-active': editor?.isActive('highlight') || activeDropdown === 'highlight' }"
            @click="toggleDropdown('highlight')"
          >
            <Icon name="material-symbols:ink-highlighter" />
          </button>
          <div v-if="activeDropdown === 'highlight'" class="color-palette-popover">
            <div class="palette-grid">
              <button
                v-for="h in highlightColors"
                :key="h.name"
                type="button"
                class="color-swatch"
                :style="{ backgroundColor: h.value }"
                :title="h.name"
                @click="applyHighlight(h.value)"
              />
            </div>
            <button type="button" class="clear-swatch-btn" @click="applyHighlight('')">
              Remove Highlight
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- Combined Text Alignment Dropdown -->
      <div class="toolbar-group dropdown-wrapper">
        <button
          type="button"
          class="toolbar-btn dropdown-btn"
          title="Text Alignment Options"
          :class="{ 'is-active': isAlignActive || activeDropdown === 'align' }"
          @click="toggleDropdown('align')"
        >
          <Icon :name="currentAlignIcon" />
          <Icon name="material-symbols:arrow-drop-down" class="dropdown-arrow-icon" />
        </button>

        <div v-if="activeDropdown === 'align'" class="toolbar-dropdown-menu">
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive({ textAlign: 'left' }) }"
            @click="editor?.chain().focus().setTextAlign('left').run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:format-align-left" /> Align Left
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive({ textAlign: 'center' }) }"
            @click="editor?.chain().focus().setTextAlign('center').run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:format-align-center" /> Align Center
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive({ textAlign: 'right' }) }"
            @click="editor?.chain().focus().setTextAlign('right').run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:format-align-right" /> Align Right
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive({ textAlign: 'justify' }) }"
            @click="editor?.chain().focus().setTextAlign('justify').run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:format-align-justify" /> Justify
          </button>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- Combined Lists & Checklists Dropdown -->
      <div class="toolbar-group dropdown-wrapper">
        <button
          type="button"
          class="toolbar-btn dropdown-btn"
          title="Lists & Checklists"
          :class="{ 'is-active': isListActive || activeDropdown === 'list' }"
          @click="toggleDropdown('list')"
        >
          <Icon :name="currentListIcon" />
          <Icon name="material-symbols:arrow-drop-down" class="dropdown-arrow-icon" />
        </button>

        <div v-if="activeDropdown === 'list'" class="toolbar-dropdown-menu">
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('bulletList') }"
            @click="editor?.chain().focus().toggleBulletList().run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:format-list-bulleted" /> Bulleted List
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('orderedList') }"
            @click="editor?.chain().focus().toggleOrderedList().run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:format-list-numbered" /> Numbered List
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('taskList') }"
            @click="editor?.chain().focus().toggleTaskList().run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:checklist" /> Checklist / Task List
          </button>
        </div>
      </div>

      <div class="toolbar-divider" />

      <!-- Combined Insert (Blocks, Media & Tables) Dropdown -->
      <div class="toolbar-group dropdown-wrapper">
        <button
          type="button"
          class="toolbar-btn insert-select-btn"
          title="Insert Block, Media or Table"
          :class="{ 'is-active': isInsertActive || activeDropdown === 'insert' }"
          @click="toggleDropdown('insert')"
        >
          <Icon name="material-symbols:add-box" />
          <span class="insert-label">Insert</span>
          <Icon name="material-symbols:arrow-drop-down" class="dropdown-arrow-icon" />
        </button>

        <div v-if="activeDropdown === 'insert'" class="toolbar-dropdown-menu insert-dropdown-menu">
          <button type="button" @click="openLinkModal(); closeAllDropdowns()">
            <Icon name="material-symbols:link" /> Link
          </button>
          <button type="button" @click="showImageModal = true; closeAllDropdowns()">
            <Icon name="material-symbols:image" /> Image
          </button>
          <button type="button" @click="showYoutubeModal = true; closeAllDropdowns()">
            <Icon name="material-symbols:smart-display-outline" /> YouTube Video
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('table') }"
            @click="insertDefaultTable(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:table" /> Responsive Table
          </button>
          <div class="dropdown-item-divider" />
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('codeBlock') }"
            @click="editor?.chain().focus().toggleCodeBlock().run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:terminal" /> Code Block
          </button>
          <button
            type="button"
            :class="{ 'is-active': editor?.isActive('blockquote') }"
            @click="editor?.chain().focus().toggleBlockquote().run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:format-quote" /> Blockquote
          </button>
          <button
            type="button"
            @click="editor?.chain().focus().setHorizontalRule().run(); closeAllDropdowns()"
          >
            <Icon name="material-symbols:horizontal-rule" /> Divider Line
          </button>
          <div class="dropdown-item-divider" />
          <div class="dropdown-submenu-header">Callouts:</div>
          <div class="callout-grid-options">
            <button type="button" class="callout-opt tip" @click="insertCallout('tip')">
              <span class="icon">💡</span> Tip
            </button>
            <button type="button" class="callout-opt info" @click="insertCallout('info')">
              <span class="icon">ℹ️</span> Info
            </button>
            <button type="button" class="callout-opt warning" @click="insertCallout('warning')">
              <span class="icon">⚠️</span> Warn
            </button>
            <button type="button" class="callout-opt danger" @click="insertCallout('danger')">
              <span class="icon">🚨</span> Danger
            </button>
            <button type="button" class="callout-opt note" @click="insertCallout('note')">
              <span class="icon">📝</span> Note
            </button>
          </div>
        </div>
      </div>

      <!-- Utility: Fullscreen -->
      <div class="toolbar-group right-utils">
        <button
          type="button"
          class="toolbar-btn"
          :title="isFullscreen ? 'Exit Fullscreen' : 'Zen Fullscreen Writing'"
          :class="{ 'is-active': isFullscreen }"
          @click="toggleFullscreen"
        >
          <Icon :name="isFullscreen ? 'material-symbols:fullscreen-exit' : 'material-symbols:fullscreen'" />
        </button>
      </div>
    </header>

    <!-- Simple Comment Toolbar (When variant is comment / simple) -->
    <header v-else-if="variant === 'comment'" class="tiptap-simple-toolbar" @mousedown.prevent>
      <button
        type="button"
        class="toolbar-btn"
        title="Bold"
        :class="{ 'is-active': editor?.isActive('bold') }"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Icon name="material-symbols:format-bold" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Italic"
        :class="{ 'is-active': editor?.isActive('italic') }"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Icon name="material-symbols:format-italic" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Underline"
        :class="{ 'is-active': editor?.isActive('underline') }"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <Icon name="material-symbols:format-underlined" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Code"
        :class="{ 'is-active': editor?.isActive('code') }"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        <Icon name="material-symbols:code" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Spoiler"
        :class="{ 'is-active': editor?.isActive('spoiler') }"
        @click="editor?.chain().focus().toggleSpoiler().run()"
      >
        <Icon name="material-symbols:visibility-off" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Link"
        :class="{ 'is-active': editor?.isActive('link') }"
        @click="openLinkModal"
      >
        <Icon name="material-symbols:link" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="Quote"
        :class="{ 'is-active': editor?.isActive('blockquote') }"
        @click="editor?.chain().focus().toggleBlockquote().run()"
      >
        <Icon name="material-symbols:format-quote" />
      </button>
    </header>

    <!-- Table Context Action Sub-bar (Only shown when cursor is inside a table) -->
    <div v-if="editor?.isActive('table')" class="table-context-toolbar" @mousedown.prevent>
      <span class="context-title"><Icon name="material-symbols:table" /> Table:</span>
      <button type="button" class="ctx-btn" title="Add Row Above" @click="editor?.chain().focus().addRowBefore().run()">
        + Row Above
      </button>
      <button type="button" class="ctx-btn" title="Add Row Below" @click="editor?.chain().focus().addRowAfter().run()">
        + Row Below
      </button>
      <button type="button" class="ctx-btn danger" title="Delete Row" @click="editor?.chain().focus().deleteRow().run()">
        - Row
      </button>
      <div class="ctx-divider" />
      <button type="button" class="ctx-btn" title="Add Column Before" @click="editor?.chain().focus().addColumnBefore().run()">
        + Col Left
      </button>
      <button type="button" class="ctx-btn" title="Add Column After" @click="editor?.chain().focus().addColumnAfter().run()">
        + Col Right
      </button>
      <button type="button" class="ctx-btn danger" title="Delete Column" @click="editor?.chain().focus().deleteColumn().run()">
        - Col
      </button>
      <div class="ctx-divider" />
      <button type="button" class="ctx-btn" title="Toggle Header Row" @click="editor?.chain().focus().toggleHeaderRow().run()">
        Header Row
      </button>
      <button type="button" class="ctx-btn" title="Toggle Header Col" @click="editor?.chain().focus().toggleHeaderColumn().run()">
        Header Col
      </button>
      <button type="button" class="ctx-btn delete-table" title="Delete Entire Table" @click="editor?.chain().focus().deleteTable().run()">
        <Icon name="material-symbols:delete" /> Delete Table
      </button>
    </div>

    <!-- Floating Bubble Menu (Selection-driven inline toolbar) -->
    <div
      v-if="variant === 'enterprise' && showFloatingBubble && bubblePos.visible"
      class="floating-bubble-menu"
      :style="{ top: `${bubblePos.top}px`, left: `${bubblePos.left}px` }"
      @mousedown.prevent
    >
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('bold') }"
        title="Bold"
        @click="editor?.chain().focus().toggleBold().run()"
      >
        <Icon name="material-symbols:format-bold" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('italic') }"
        title="Italic"
        @click="editor?.chain().focus().toggleItalic().run()"
      >
        <Icon name="material-symbols:format-italic" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('underline') }"
        title="Underline"
        @click="editor?.chain().focus().toggleUnderline().run()"
      >
        <Icon name="material-symbols:format-underlined" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('strike') }"
        title="Strike"
        @click="editor?.chain().focus().toggleStrike().run()"
      >
        <Icon name="material-symbols:format-strikethrough" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('code') }"
        title="Code"
        @click="editor?.chain().focus().toggleCode().run()"
      >
        <Icon name="material-symbols:code" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('highlight') }"
        title="Highlight"
        @click="editor?.chain().focus().toggleHighlight({ color: '#fea55f44' }).run()"
      >
        <Icon name="material-symbols:ink-highlighter" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('link') }"
        title="Link"
        @click="openLinkModal"
      >
        <Icon name="material-symbols:link" />
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
        title="H2"
        @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
      >
        H2
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('heading', { level: 3 }) }"
        title="H3"
        @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
      >
        H3
      </button>
      <button
        type="button"
        :class="{ 'is-active': editor?.isActive('spoiler') }"
        title="Spoiler"
        @click="editor?.chain().focus().toggleSpoiler().run()"
      >
        <Icon name="material-symbols:visibility-off" />
      </button>
    </div>

    <!-- Main Editor Content Area -->
    <div
      class="editor-content-area"
      :style="{ minHeight: minHeight, maxHeight: isFullscreen ? 'none' : maxHeight }"
      @click="handleWrapperClick"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent="handleContextMenu"
      @keydown="handleEditorKeyDown"
    >
      <TiptapEditorContent :editor="editor" class="tiptap-content" />
    </div>

    <!-- Enterprise Status / Word Count Bar -->
    <footer v-if="variant === 'enterprise'" class="tiptap-status-bar">
      <div class="status-left">
        <span class="status-stat">
          <strong>{{ wordCount }}</strong> words
        </span>
        <span class="stat-bullet">•</span>
        <span class="status-stat">
          <strong>{{ charCount }}</strong> characters
        </span>
        <span class="stat-bullet">•</span>
        <span class="status-stat reading-time">
          <Icon name="material-symbols:schedule" /> {{ readingTime }} min read
        </span>
      </div>

      <div class="status-right">
        <span class="tip-shortcut">Type <kbd>/</kbd> for blocks</span>
        <span class="stat-bullet">•</span>
        <button
          type="button"
          class="dir-toggle-btn"
          title="Toggle Writing Direction (LTR / RTL)"
          @click="toggleTextDirection"
        >
          <Icon name="material-symbols:format-textdirection-l-to-r" />
          {{ currentDirection.toUpperCase() }}
        </button>
      </div>
    </footer>

    <!-- Slash Commands Popup Menu -->
    <div
      v-if="showSlashMenu"
      class="slash-command-menu"
      :style="{ top: `${slashMenuPos.y}px`, left: `${slashMenuPos.x}px` }"
      @mousedown.prevent
    >
      <div class="slash-header">Insert Block</div>
      <div class="slash-items">
        <button type="button" @click="executeSlash('h1')">
          <span class="badge">H1</span> Heading 1
        </button>
        <button type="button" @click="executeSlash('h2')">
          <span class="badge">H2</span> Heading 2
        </button>
        <button type="button" @click="executeSlash('h3')">
          <span class="badge">H3</span> Heading 3
        </button>
        <button type="button" @click="executeSlash('bullet')">
          <Icon name="material-symbols:format-list-bulleted" /> Bulleted List
        </button>
        <button type="button" @click="executeSlash('numbered')">
          <Icon name="material-symbols:format-list-numbered" /> Numbered List
        </button>
        <button type="button" @click="executeSlash('task')">
          <Icon name="material-symbols:checklist" /> Checklist / Task List
        </button>
        <button type="button" @click="executeSlash('quote')">
          <Icon name="material-symbols:format-quote" /> Blockquote
        </button>
        <button type="button" @click="executeSlash('code')">
          <Icon name="material-symbols:terminal" /> Code Block
        </button>
        <button type="button" @click="executeSlash('callout')">
          <Icon name="material-symbols:campaign-outline" /> Callout / Alert
        </button>
        <button type="button" @click="executeSlash('table')">
          <Icon name="material-symbols:table" /> Responsive Table
        </button>
        <button type="button" @click="executeSlash('divider')">
          <Icon name="material-symbols:horizontal-rule" /> Divider
        </button>
        <button type="button" @click="executeSlash('image')">
          <Icon name="material-symbols:image" /> Image
        </button>
        <button type="button" @click="executeSlash('youtube')">
          <Icon name="material-symbols:smart-display-outline" /> YouTube Video
        </button>
      </div>
    </div>

    <!-- Link Modal -->
    <div v-if="showLinkModal" class="tiptap-modal-backdrop" @click.self="showLinkModal = false">
      <div class="tiptap-modal">
        <div class="modal-header">
          <h3>Insert / Edit Link</h3>
          <button type="button" class="close-btn" @click="showLinkModal = false">
            <Icon name="material-symbols:close" />
          </button>
        </div>
        <div class="modal-body">
          <label>URL</label>
          <input
            v-model="linkUrl"
            type="url"
            placeholder="https://example.com"
            @keydown.enter.prevent="applyLink"
          />
          <label class="checkbox-label">
            <input v-model="linkOpenNewTab" type="checkbox" />
            Open in new tab
          </label>
        </div>
        <div class="modal-footer">
          <button v-if="editor?.isActive('link')" type="button" class="remove-btn" @click="removeLink">
            Remove Link
          </button>
          <div class="spacer" />
          <button type="button" class="cancel-btn" @click="showLinkModal = false">Cancel</button>
          <button type="button" class="apply-btn" @click="applyLink">Apply Link</button>
        </div>
      </div>
    </div>

    <!-- Image Modal -->
    <div v-if="showImageModal" class="tiptap-modal-backdrop" @click.self="showImageModal = false">
      <div class="tiptap-modal">
        <div class="modal-header">
          <h3>Insert Image</h3>
          <button type="button" class="close-btn" @click="showImageModal = false">
            <Icon name="material-symbols:close" />
          </button>
        </div>
        <div class="modal-body">
          <label>Image URL</label>
          <input
            v-model="imageUrl"
            type="url"
            placeholder="https://example.com/image.png"
            @keydown.enter.prevent="insertImage"
          />
          <label>Alt Text / Description</label>
          <input v-model="imageAlt" type="text" placeholder="Screenshot of architecture..." />
          <div v-if="imageUrl" class="image-preview-box">
            <img :src="imageUrl" alt="preview" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="cancel-btn" @click="showImageModal = false">Cancel</button>
          <button type="button" class="apply-btn" :disabled="!imageUrl" @click="insertImage">
            Insert Image
          </button>
        </div>
      </div>
    </div>

    <!-- YouTube Embed Modal -->
    <div v-if="showYoutubeModal" class="tiptap-modal-backdrop" @click.self="showYoutubeModal = false">
      <div class="tiptap-modal">
        <div class="modal-header">
          <h3>Embed YouTube Video</h3>
          <button type="button" class="close-btn" @click="showYoutubeModal = false">
            <Icon name="material-symbols:close" />
          </button>
        </div>
        <div class="modal-body">
          <label>YouTube URL or Video ID</label>
          <input
            v-model="youtubeUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            @keydown.enter.prevent="insertYoutube"
          />
          <p class="modal-hint">Supports regular watch URLs, share links, and embed links.</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="cancel-btn" @click="showYoutubeModal = false">Cancel</button>
          <button type="button" class="apply-btn" :disabled="!youtubeUrl" @click="insertYoutube">
            Embed Video
          </button>
        </div>
      </div>
    </div>

    <!-- Legacy Context Menu for Right-Click / Double-Click on mobile -->
    <ContextMenu
      :show="showFormattingMenu"
      :x="menuPosition.x"
      :y="menuPosition.y"
      @close="showFormattingMenu = false"
    >
      <button :class="{ 'is-active': editor?.isActive('bold') }" @click="toggleMark('bold')">
        <Icon name="material-symbols:format-bold" /> Bold
      </button>
      <button :class="{ 'is-active': editor?.isActive('italic') }" @click="toggleMark('italic')">
        <Icon name="material-symbols:format-italic" /> Italic
      </button>
      <button :class="{ 'is-active': editor?.isActive('underline') }" @click="toggleMark('underline')">
        <Icon name="material-symbols:format-underlined" /> Underline
      </button>
      <button :class="{ 'is-active': editor?.isActive('strike') }" @click="toggleMark('strike')">
        <Icon name="material-symbols:format-strikethrough" /> Strike
      </button>
      <button :class="{ 'is-active': editor?.isActive('code') }" @click="toggleMark('code')">
        <Icon name="material-symbols:code" /> Code
      </button>
      <button :class="{ 'is-active': editor?.isActive('spoiler') }" @click="toggleMark('spoiler')">
        <Icon name="material-symbols:visibility-off" /> Spoiler
      </button>
      <button @click="showFormattingMenu = false; openLinkModal()">
        <Icon name="material-symbols:link" /> Link
      </button>
    </ContextMenu>
  </div>
</template>

<script setup lang="ts">
import { all, createLowlight } from "lowlight";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import {
  MyUnderline,
  MyLink,
  MySpoiler,
  MyPlaceholder,
  MyTable,
  MyTableRow,
  MyTableCell,
  MyTableHeader,
  MyImage,
  MyTextAlign,
  MyHighlight,
  MyColor,
  MyTextStyle,
  MyTaskList,
  MyTaskItem,
  MyYoutube,
  MyCharacterCount,
  MyHeading,
  MyCallout,
  Direction,
} from "~/composables/tiptapExt";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    variant?: "enterprise" | "comment" | "simple";
    minHeight?: string;
    maxHeight?: string;
  }>(),
  {
    variant: "enterprise",
    placeholder: "Write your masterpiece...",
    minHeight: "350px",
    maxHeight: "75vh",
  }
);

const emit = defineEmits(["update:modelValue", "focus", "blur", "character-count"]);

const isFocused = ref(false);
const isFullscreen = ref(false);
const editorContainerRef = ref<HTMLElement | null>(null);

// Dropdown & Popover toggles with combined menu manager
type DropdownType = "heading" | "moreFormat" | "color" | "highlight" | "align" | "list" | "insert" | null;
const activeDropdown = ref<DropdownType>(null);

const toggleDropdown = (name: DropdownType) => {
  activeDropdown.value = activeDropdown.value === name ? null : name;
};

const closeAllDropdowns = () => {
  activeDropdown.value = null;
};

// Alignment state helpers
const currentAlignIcon = computed(() => {
  if (!editor.value) return "material-symbols:format-align-left";
  if (editor.value.isActive({ textAlign: "center" })) return "material-symbols:format-align-center";
  if (editor.value.isActive({ textAlign: "right" })) return "material-symbols:format-align-right";
  if (editor.value.isActive({ textAlign: "justify" })) return "material-symbols:format-align-justify";
  return "material-symbols:format-align-left";
});

const isAlignActive = computed(() => {
  if (!editor.value) return false;
  return (
    editor.value.isActive({ textAlign: "center" }) ||
    editor.value.isActive({ textAlign: "right" }) ||
    editor.value.isActive({ textAlign: "justify" })
  );
});

// List state helpers
const currentListIcon = computed(() => {
  if (!editor.value) return "material-symbols:format-list-bulleted";
  if (editor.value.isActive("taskList")) return "material-symbols:checklist";
  if (editor.value.isActive("orderedList")) return "material-symbols:format-list-numbered";
  return "material-symbols:format-list-bulleted";
});

const isListActive = computed(() => {
  if (!editor.value) return false;
  return (
    editor.value.isActive("bulletList") ||
    editor.value.isActive("orderedList") ||
    editor.value.isActive("taskList")
  );
});

// More formatting active state
const isMoreFormatActive = computed(() => {
  if (!editor.value) return false;
  return (
    editor.value.isActive("strike") ||
    editor.value.isActive("code") ||
    editor.value.isActive("spoiler")
  );
});

// Insert active state
const isInsertActive = computed(() => {
  if (!editor.value) return false;
  return (
    editor.value.isActive("table") ||
    editor.value.isActive("codeBlock") ||
    editor.value.isActive("blockquote") ||
    editor.value.isActive("callout")
  );
});

// Modals
const showLinkModal = ref(false);
const linkUrl = ref("");
const linkOpenNewTab = ref(true);

const showImageModal = ref(false);
const imageUrl = ref("");
const imageAlt = ref("");

const showYoutubeModal = ref(false);
const youtubeUrl = ref("");

// Floating Bubble state
const showFloatingBubble = ref(false);
const bubblePos = reactive({ top: 0, left: 0, visible: false });

// Slash Menu state
const showSlashMenu = ref(false);
const slashMenuPos = reactive({ x: 0, y: 0 });

// Context Menu (Right-Click)
const showFormattingMenu = ref(false);
const menuPosition = reactive({ x: 0, y: 0 });

// Text Direction
const currentDirection = ref<"ltr" | "rtl">("ltr");

// Color swatches matching developer theme
const textColors = [
  { name: "Default White", value: "#ffffff" },
  { name: "Accent Orange", value: "#fea55f" },
  { name: "Accent Mint", value: "#43d9ad" },
  { name: "Accent Coral", value: "#e99287" },
  { name: "Accent Purple", value: "#c98bdf" },
  { name: "Accent Gold", value: "#ffd714" },
  { name: "Muted Slate", value: "#607b96" },
  { name: "Sky Blue", value: "#38bdf8" },
  { name: "Rose Red", value: "#f87171" },
];

const highlightColors = [
  { name: "Gold Glow", value: "rgba(255, 215, 20, 0.35)" },
  { name: "Mint Glow", value: "rgba(67, 217, 173, 0.35)" },
  { name: "Orange Glow", value: "rgba(254, 165, 95, 0.35)" },
  { name: "Purple Glow", value: "rgba(201, 139, 223, 0.35)" },
  { name: "Blue Glow", value: "rgba(56, 189, 248, 0.35)" },
  { name: "Pink Glow", value: "rgba(233, 146, 135, 0.35)" },
];

// Initialize lowlight for code syntax highlighting
const lowlight = createLowlight(all);

// Build extensions based on variant — blog-specific block nodes
// (headings, tables, callouts, code blocks, images, etc.) are only
// loaded for the "enterprise" editor used on blog pages.
const baseExtensions = [
  TiptapStarterKit.configure({
    codeBlock: false,
    heading: false,
  }),
  MyUnderline,
  MyLink.configure({
    openOnClick: false,
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer",
    },
  }),
  MySpoiler,
  MyPlaceholder.configure({
    placeholder: props.placeholder || "Start writing...",
  }),
  Direction,
];

const blogExtensions = [
  MyHeading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
  CodeBlockLowlight.configure({ lowlight }),
  MyCallout,
  MyTable.configure({ resizable: true }),
  MyTableRow,
  MyTableCell,
  MyTableHeader,
  MyImage.configure({ allowBase64: true, inline: false }),
  MyYoutube.configure({ width: 640, height: 360, nocookie: true }),
  MyTextAlign.configure({
    types: ["heading", "paragraph", "tableCell", "tableHeader", "callout"],
  }),
  MyHighlight.configure({ multicolor: true }),
  MyTextStyle,
  MyColor,
  MyTaskList,
  MyTaskItem.configure({ nested: true }),
  MyCharacterCount,
];

const editorExtensions =
  props.variant === "enterprise"
    ? [...baseExtensions, ...blogExtensions]
    : baseExtensions;

// Initialize Editor
const editor = useEditor({
  content: props.modelValue,
  extensions: editorExtensions,
  onUpdate: ({ editor }) => {
    emit("update:modelValue", editor.getHTML());
    updateSelectionBubble();
    checkSlashCommand();
  },
  onSelectionUpdate: () => {
    updateSelectionBubble();
  },
  onFocus: () => {
    isFocused.value = true;
    emit("focus");
  },
  onBlur: () => {
    isFocused.value = false;
    emit("blur");
    setTimeout(() => {
      closeAllDropdowns();
    }, 200);
  },
});

watch(
  () => props.modelValue,
  (value) => {
    if (editor.value && editor.value.getHTML() !== value) {
      editor.value.commands.setContent(value, false);
    }
  }
);

// Statistics
const wordCount = computed(() => {
  if (!editor.value) return 0;
  const text = editor.value.getText().trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
});

const charCount = computed(() => {
  return editor.value?.storage?.characterCount?.characters() || 0;
});

const readingTime = computed(() => {
  const words = wordCount.value;
  return Math.max(1, Math.ceil(words / 200));
});

// Current block type label for heading dropdown
const currentBlockLabel = computed(() => {
  if (!editor.value) return "Paragraph";
  if (editor.value.isActive("heading", { level: 1 })) return "Heading 1";
  if (editor.value.isActive("heading", { level: 2 })) return "Heading 2";
  if (editor.value.isActive("heading", { level: 3 })) return "Heading 3";
  if (editor.value.isActive("heading", { level: 4 })) return "Heading 4";
  if (editor.value.isActive("heading", { level: 5 })) return "Heading 5";
  if (editor.value.isActive("heading", { level: 6 })) return "Heading 6";
  if (editor.value.isActive("codeBlock")) return "Code Block";
  if (editor.value.isActive("blockquote")) return "Quote";
  if (editor.value.isActive("callout")) return "Callout";
  return "Paragraph";
});

// Floating selection bubble menu positioning
const updateSelectionBubble = () => {
  if (!editor.value || props.variant !== "enterprise") return;
  const { from, to, empty } = editor.value.state.selection;

  if (empty) {
    bubblePos.visible = false;
    showFloatingBubble.value = false;
    return;
  }

  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) return;

  const range = domSelection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const containerRect = editorContainerRef.value?.getBoundingClientRect();

  if (containerRect && rect.width > 0) {
    bubblePos.top = Math.max(0, rect.top - containerRect.top - 48);
    bubblePos.left = Math.max(
      10,
      rect.left - containerRect.left + rect.width / 2 - 160
    );
    bubblePos.visible = true;
    showFloatingBubble.value = true;
  }
};

// Slash command detection
const checkSlashCommand = () => {
  if (!editor.value || props.variant !== "enterprise") return;
  const { $from } = editor.value.state.selection;
  const currentLineText = $from.parent.textContent;

  if (currentLineText === "/") {
    const domSelection = window.getSelection();
    if (domSelection && domSelection.rangeCount > 0) {
      const rect = domSelection.getRangeAt(0).getBoundingClientRect();
      const containerRect = editorContainerRef.value?.getBoundingClientRect();
      if (containerRect) {
        slashMenuPos.x = Math.max(10, rect.left - containerRect.left);
        slashMenuPos.y = rect.bottom - containerRect.top + 8;
        showSlashMenu.value = true;
        return;
      }
    }
  }
  showSlashMenu.value = false;
};

const handleEditorKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    showSlashMenu.value = false;
    closeAllDropdowns();
  }
};

const executeSlash = (command: string) => {
  if (!editor.value) return;
  // Delete the typed '/'
  editor.value.commands.deleteRange({
    from: editor.value.state.selection.from - 1,
    to: editor.value.state.selection.from,
  });

  switch (command) {
    case "h1":
      editor.value.chain().focus().toggleHeading({ level: 1 }).run();
      break;
    case "h2":
      editor.value.chain().focus().toggleHeading({ level: 2 }).run();
      break;
    case "h3":
      editor.value.chain().focus().toggleHeading({ level: 3 }).run();
      break;
    case "bullet":
      editor.value.chain().focus().toggleBulletList().run();
      break;
    case "numbered":
      editor.value.chain().focus().toggleOrderedList().run();
      break;
    case "task":
      editor.value.chain().focus().toggleTaskList().run();
      break;
    case "quote":
      editor.value.chain().focus().toggleBlockquote().run();
      break;
    case "code":
      editor.value.chain().focus().toggleCodeBlock().run();
      break;
    case "callout":
      insertCallout("info");
      break;
    case "table":
      insertDefaultTable();
      break;
    case "divider":
      editor.value.chain().focus().setHorizontalRule().run();
      break;
    case "image":
      showImageModal.value = true;
      break;
    case "youtube":
      showYoutubeModal.value = true;
      break;
  }
  showSlashMenu.value = false;
};

// Table Insertion
const insertDefaultTable = () => {
  editor.value
    ?.chain()
    .focus()
    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
    .run();
};

// Callouts
const insertCallout = (type: string) => {
  editor.value?.chain().focus().toggleCallout({ type }).run();
  closeAllDropdowns();
};

// Colors
const applyTextColor = (color: string) => {
  if (!editor.value) return;
  if (!color) {
    editor.value.chain().focus().unsetColor().run();
  } else {
    editor.value.chain().focus().setColor(color).run();
  }
  closeAllDropdowns();
};

const applyHighlight = (color: string) => {
  if (!editor.value) return;
  if (!color) {
    editor.value.chain().focus().unsetHighlight().run();
  } else {
    editor.value.chain().focus().toggleHighlight({ color }).run();
  }
  closeAllDropdowns();
};

// Links
const openLinkModal = () => {
  if (!editor.value) return;
  const previousUrl = editor.value.getAttributes("link").href || "";
  linkUrl.value = previousUrl;
  linkOpenNewTab.value = true;
  showLinkModal.value = true;
  closeAllDropdowns();
};

const applyLink = () => {
  if (!editor.value) return;
  if (!linkUrl.value.trim()) {
    editor.value.chain().focus().unsetLink().run();
  } else {
    editor.value
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({
        href: linkUrl.value.trim(),
        target: linkOpenNewTab.value ? "_blank" : undefined,
      })
      .run();
  }
  showLinkModal.value = false;
};

const removeLink = () => {
  editor.value?.chain().focus().unsetLink().run();
  showLinkModal.value = false;
};

// Images
const insertImage = () => {
  if (!editor.value || !imageUrl.value.trim()) return;
  editor.value
    .chain()
    .focus()
    .setImage({
      src: imageUrl.value.trim(),
      alt: imageAlt.value.trim() || undefined,
    })
    .run();
  imageUrl.value = "";
  imageAlt.value = "";
  showImageModal.value = false;
};

// YouTube
const insertYoutube = () => {
  if (!editor.value || !youtubeUrl.value.trim()) return;
  editor.value
    .chain()
    .focus()
    .setYoutubeVideo({
      src: youtubeUrl.value.trim(),
    })
    .run();
  youtubeUrl.value = "";
  showYoutubeModal.value = false;
};

// Fullscreen
const toggleFullscreen = () => {
  isFullscreen.value = !isFullscreen.value;
};

// Direction
const toggleTextDirection = () => {
  currentDirection.value = currentDirection.value === "ltr" ? "rtl" : "ltr";
  editor.value?.chain().focus().setTextAlign(currentDirection.value === "rtl" ? "right" : "left").run();
};

// Mouse & Mobile Context formatting
const isMobile = useMobile();

const handleWrapperClick = () => {
  editor.value?.commands.focus();
};

const handleDoubleClick = (event: MouseEvent | TouchEvent) => {
  if (isMobile.value) {
    const clientX =
      "clientX" in event ? event.clientX : (event as TouchEvent).touches[0].clientX;
    const clientY =
      "clientY" in event ? event.clientY : (event as TouchEvent).touches[0].clientY;
    showFormattingMenu.value = true;
    menuPosition.x = clientX;
    menuPosition.y = clientY;
  }
};

const handleContextMenu = (event: MouseEvent | TouchEvent) => {
  const clientX =
    "clientX" in event ? event.clientX : (event as TouchEvent).touches[0].clientX;
  const clientY =
    "clientY" in event ? event.clientY : (event as TouchEvent).touches[0].clientY;
  showFormattingMenu.value = true;
  menuPosition.x = clientX;
  menuPosition.y = clientY;
};

function toggleMark(type: string) {
  if (!editor.value) return;
  if (type === "bold") editor.value.chain().focus().toggleBold().run();
  if (type === "italic") editor.value.chain().focus().toggleItalic().run();
  if (type === "underline") editor.value.chain().focus().toggleUnderline().run();
  if (type === "strike") editor.value.chain().focus().toggleStrike().run();
  if (type === "code") editor.value.chain().focus().toggleCode().run();
  if (type === "spoiler") editor.value.chain().focus().toggleSpoiler().run();
  showFormattingMenu.value = false;
}

const handleClickOutside = (event: MouseEvent) => {
  if (
    editorContainerRef.value &&
    !editorContainerRef.value.contains(event.target as Node)
  ) {
    closeAllDropdowns();
  }
};

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener("click", handleClickOutside);
  }
});

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener("click", handleClickOutside);
  }
  unref(editor)?.destroy();
});
</script>

<style lang="scss">
.tiptap-editor-wrapper {
  background: $primary3;
  border: 1px solid $lines;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  position: relative;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: $secondary1;
  }

  &.is-focused {
    border-color: $accent1;
    box-shadow: 0 0 0 1px rgba($accent1, 0.3);
  }

  &.is-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999;
    border-radius: 0;
    background: $primary1;

    .editor-content-area {
      flex: 1;
      overflow-y: auto;
      padding: 3rem 15% !important;
      max-height: none !important;

      @include mobile {
        padding: 1.5rem 1rem !important;
      }
    }
  }

  /* Enterprise Sticky Toolbar */
  .tiptap-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px 12px;
    background: rgba($primary2, 0.95);
    border-bottom: 1px solid $lines;
    border-top-left-radius: 11px;
    border-top-right-radius: 11px;
    position: sticky;
    top: 0;
    z-index: 30;
    backdrop-filter: blur(8px);

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: $lines;
      margin: 0 4px;
    }

    .right-utils {
      margin-left: auto;
    }

    .toolbar-btn {
      background: transparent;
      border: 1px solid transparent;
      color: $secondary1;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      cursor: pointer;
      font-size: 1.1rem;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: rgba($accent1, 0.1);
        color: $accent1;
      }

      &.is-active {
        background: $accent1;
        color: $primary1;
        font-weight: bold;
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
    }

    .dropdown-wrapper {
      position: relative;
      display: flex;
      align-items: center;

      .select-btn,
      .insert-select-btn {
        width: auto;
        padding: 0 8px;
        gap: 4px;
        font-size: 0.85rem;
        font-family: inherit;
        border: 1px solid $lines;
        background: $primary3;

        span {
          font-weight: 500;
          color: $secondary4;
        }

        &:hover {
          border-color: $accent1;
        }

        @include mobile {
          .insert-label {
            display: none;
          }
        }
      }

      .dropdown-btn {
        width: auto;
        padding: 0 6px;
        gap: 2px;
      }

      .dropdown-arrow-icon {
        font-size: 1rem;
        opacity: 0.7;
        margin-left: -2px;
      }
    }

    .toolbar-dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: $primary2;
      border: 1px solid $lines;
      border-radius: 8px;
      padding: 6px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      z-index: 60;
      min-width: 170px;
      display: flex;
      flex-direction: column;
      gap: 2px;

      button {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 10px;
        background: transparent;
        border: none;
        color: $secondary4;
        font-size: 0.83rem;
        cursor: pointer;
        border-radius: 6px;
        text-align: left;
        width: 100%;
        transition: background 0.15s, color 0.15s;

        &:hover {
          background: rgba($accent1, 0.15);
          color: $accent1;
        }

        &.is-active {
          background: $accent1;
          color: $primary1;
          font-weight: bold;

          .label-badge {
            color: $primary1;
          }
        }

        .label-badge {
          display: inline-block;
          width: 22px;
          font-size: 0.75rem;
          font-weight: bold;
          color: $accent1;
        }
      }

      &.heading-dropdown-menu {
        min-width: 200px;
      }

      &.insert-dropdown-menu {
        min-width: 205px;
        right: 0;
        left: auto;

        [dir="rtl"] & {
          right: auto;
          left: 0;
        }
      }

      @include mobile {
        max-width: 90vw;
      }

      .dropdown-item-divider {
        height: 1px;
        background: $lines;
        margin: 4px 0;
      }

      .dropdown-submenu-header {
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: $secondary1;
        padding: 4px 8px 2px;
        font-weight: bold;
      }

      .callout-grid-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 4px;
        padding: 2px 4px;

        .callout-opt {
          font-size: 0.78rem;
          padding: 5px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid $lines;
          display: flex;
          align-items: center;
          gap: 4px;

          &:hover {
            border-color: $accent1;
            background: rgba($accent1, 0.15);
          }
        }
      }
    }

    .color-palette-popover {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: $primary2;
      border: 1px solid $lines;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      z-index: 60;
      min-width: 140px;

      .palette-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 8px;

        .color-swatch {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: transform 0.15s;

          &:hover {
            transform: scale(1.15);
            border-color: white;
          }
        }
      }

      .clear-swatch-btn {
        width: 100%;
        padding: 4px;
        font-size: 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid $lines;
        color: $secondary1;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          color: $secondary4;
          background: rgba(255, 255, 255, 0.1);
        }
      }
    }
  }

  /* Simple Comment Toolbar */
  .tiptap-simple-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: $primary2;
    border-bottom: 1px solid $lines;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;

    .toolbar-btn {
      background: transparent;
      border: none;
      color: $secondary1;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;

      &:hover {
        background: rgba($accent1, 0.1);
        color: $accent1;
      }

      &.is-active {
        background: $accent1;
        color: $primary1;
      }
    }
  }

  /* Active Table Context Toolbar */
  .table-context-toolbar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba($primary1, 0.95);
    border-bottom: 1px solid $lines;
    font-size: 0.8rem;
    overflow-x: auto;

    .context-title {
      color: $accent2;
      font-weight: bold;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-right: 4px;
    }

    .ctx-btn {
      background: $primary3;
      border: 1px solid $lines;
      color: $secondary1;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        border-color: $accent2;
        color: $secondary4;
      }

      &.danger {
        color: #f87171;
        &:hover {
          border-color: #f87171;
        }
      }

      &.delete-table {
        background: rgba(#f44336, 0.15);
        color: #f44336;
        border-color: rgba(#f44336, 0.4);
        margin-left: auto;

        &:hover {
          background: #f44336;
          color: white;
        }
      }
    }

    .ctx-divider {
      width: 1px;
      height: 14px;
      background: $lines;
      margin: 0 2px;
    }
  }

  /* Floating Bubble Menu */
  .floating-bubble-menu {
    position: absolute;
    background: $primary1;
    border: 1px solid $lines;
    border-radius: 8px;
    padding: 4px;
    display: flex;
    align-items: center;
    gap: 2px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 40;
    backdrop-filter: blur(10px);

    button {
      background: transparent;
      border: none;
      color: $secondary1;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.95rem;

      &:hover {
        background: rgba($accent1, 0.15);
        color: $accent1;
      }

      &.is-active {
        background: $accent1;
        color: $primary1;
      }
    }
  }

  /* Editor Content Area */
  .editor-content-area {
    padding: 16px 20px;
    overflow-y: auto;
    cursor: text;

    .tiptap-content {
      height: 100%;
    }
  }

  /* Status Bar */
  .tiptap-status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 14px;
    background: $primary2;
    border-top: 1px solid $lines;
    font-size: 0.78rem;
    color: $secondary1;
    border-bottom-left-radius: 11px;
    border-bottom-right-radius: 11px;

    .status-left,
    .status-right {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-stat strong {
      color: $secondary4;
    }

    .stat-bullet {
      opacity: 0.4;
    }

    .reading-time {
      display: flex;
      align-items: center;
      gap: 3px;
      color: $accent2;
    }

    .tip-shortcut {
      opacity: 0.7;

      kbd {
        background: rgba(255, 255, 255, 0.1);
        padding: 1px 4px;
        border-radius: 3px;
        color: $accent1;
        font-family: $main-font;
      }
    }

    .dir-toggle-btn {
      background: transparent;
      border: 1px solid $lines;
      color: $secondary1;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;

      &:hover {
        border-color: $accent1;
        color: $accent1;
      }
    }
  }

  /* Slash Command Menu */
  .slash-command-menu {
    position: absolute;
    background: $primary2;
    border: 1px solid $lines;
    border-radius: 10px;
    padding: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    z-index: 60;
    width: 240px;
    max-height: 280px;
    overflow-y: auto;

    .slash-header {
      font-size: 0.7rem;
      text-transform: uppercase;
      color: $secondary1;
      font-weight: bold;
      padding: 4px 8px;
      margin-bottom: 4px;
    }

    .slash-items {
      display: flex;
      flex-direction: column;
      gap: 2px;

      button {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 7px 10px;
        background: transparent;
        border: none;
        color: $secondary4;
        font-size: 0.82rem;
        cursor: pointer;
        border-radius: 6px;
        text-align: left;
        width: 100%;

        .badge {
          display: inline-block;
          font-weight: bold;
          font-size: 0.75rem;
          color: $accent1;
          width: 20px;
        }

        &:hover {
          background: rgba($accent1, 0.15);
          color: $accent1;
        }
      }
    }
  }

  /* Modals */
  .tiptap-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    backdrop-filter: blur(4px);

    .tiptap-modal {
      background: $primary2;
      border: 1px solid $lines;
      border-radius: 12px;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid $lines;

        h3 {
          margin: 0;
          font-size: 1.1rem;
          color: $secondary4;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: $secondary1;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0;

          &:hover {
            color: $accent1;
          }
        }
      }

      .modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;

        label {
          font-size: 0.85rem;
          color: $secondary1;
          font-weight: bold;
        }

        input[type="text"],
        input[type="url"] {
          background: $primary3;
          border: 1px solid $lines;
          color: $secondary4;
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 0.95rem;

          &:focus {
            outline: none;
            border-color: $accent1;
          }
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: $secondary4;
          font-weight: normal;
        }

        .modal-hint {
          font-size: 0.78rem;
          color: $secondary1;
          margin: 0;
        }

        .image-preview-box {
          margin-top: 8px;
          max-height: 180px;
          overflow: hidden;
          border-radius: 6px;
          border: 1px solid $lines;

          img {
            width: 100%;
            height: auto;
            object-fit: cover;
          }
        }
      }

      .modal-footer {
        display: flex;
        align-items: center;
        padding: 14px 20px;
        border-top: 1px solid $lines;
        gap: 10px;

        .spacer {
          flex: 1;
        }

        .cancel-btn {
          background: transparent;
          border: 1px solid $lines;
          color: $secondary1;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;

          &:hover {
            border-color: $secondary1;
            color: $secondary4;
          }
        }

        .apply-btn {
          background: $accent1;
          color: $primary1;
          border: none;
          font-weight: bold;
          padding: 8px 18px;
          border-radius: 6px;
          cursor: pointer;

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          &:hover:not(:disabled) {
            background: color-mix(in srgb, $accent1 85%, white);
          }
        }

        .remove-btn {
          background: transparent;
          border: none;
          color: #f87171;
          cursor: pointer;
          font-size: 0.85rem;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    }
  }

  /* ProseMirror typography styles */
  .ProseMirror {
    outline: none;
    line-height: 1.7;
    color: $secondary4;
    font-size: 1.05rem;
    min-height: 180px;

    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: $secondary1;
      opacity: 0.4;
      pointer-events: none;
      height: 0;
    }

    h1, h2, h3, h4, h5, h6 {
      color: $secondary4;
      font-weight: 700;
      line-height: 1.3;
      margin-top: 2rem;
      margin-bottom: 0.8rem;
    }

    h1 {
      font-size: 2.2rem;
      color: $gradients2;
      border-bottom: 1px solid $lines;
      padding-bottom: 0.5rem;
    }

    h2 {
      font-size: 1.75rem;
      color: $accent1;
    }

    h3 {
      font-size: 1.4rem;
      color: $accent2;
    }

    h4 {
      font-size: 1.2rem;
      color: $accent4;
    }

    h5 {
      font-size: 1.05rem;
    }

    h6 {
      font-size: 0.95rem;
      color: $secondary1;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    p {
      margin-bottom: 1.2rem;
    }

    a {
      color: $accent2;
      text-decoration: underline;
      text-underline-offset: 3px;
      cursor: pointer;

      &:hover {
        color: color-mix(in srgb, $accent2 80%, white);
      }
    }

    code {
      background: rgba(128, 128, 128, 0.15);
      color: $accent1;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: $main-font;
      font-size: 0.9em;
    }

    pre {
      background: $code-snippets-bg;
      border: 1px solid $lines;
      border-radius: 10px;
      padding: 1.2rem;
      margin: 1.5rem 0;
      overflow-x: auto;

      code {
        background: transparent;
        color: inherit;
        padding: 0;
        font-size: 0.9rem;
        font-family: $main-font;
      }
    }

    blockquote {
      border-left: 4px solid $accent1;
      padding: 0.75rem 1.2rem;
      margin: 1.5rem 0;
      background: rgba($accent1, 0.04);
      border-radius: 0 8px 8px 0;
      color: $secondary1;
      font-style: italic;

      p:last-child {
        margin-bottom: 0;
      }

      &[dir="rtl"] {
        border-left: none;
        border-right: 4px solid $accent1;
        border-radius: 8px 0 0 8px;
      }
    }

    hr {
      border: none;
      border-top: 2px dashed $lines;
      margin: 2.5rem 0;
    }

    ul, ol {
      padding-inline-start: 1.8rem;
      margin-bottom: 1.2rem;

      li {
        margin-bottom: 0.4rem;
      }
    }

    /* Task Lists / Checklists */
    ul[data-type="taskList"] {
      list-style: none;
      padding-inline-start: 0.5rem;

      li[data-type="taskItem"] {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 0.4rem;

        label {
          margin-top: 3px;
          cursor: pointer;

          input[type="checkbox"] {
            accent-color: $accent2;
            width: 16px;
            height: 16px;
            cursor: pointer;
          }
        }

        div {
          flex: 1;
        }

        &[data-checked="true"] > div {
          text-decoration: line-through;
          color: $secondary1;
        }
      }
    }

    /* Enterprise Tables */
    table {
      border-collapse: collapse;
      table-layout: fixed;
      width: 100%;
      margin: 1.5rem 0;
      overflow: hidden;
      border-radius: 8px;
      border: 1px solid $lines;

      td, th {
        min-width: 100px;
        border: 1px solid $lines;
        padding: 10px 14px;
        vertical-align: top;
        box-sizing: border-box;
        position: relative;

        > * {
          margin-bottom: 0;
        }
      }

      th {
        font-weight: bold;
        background: rgba($primary1, 0.8);
        color: $accent1;
        text-align: left;
      }

      tr:nth-child(even) td {
        background: rgba(255, 255, 255, 0.015);
      }

      .selectedCell:after {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        background: rgba($accent1, 0.15);
        pointer-events: none;
      }
    }

    /* Callouts / Alert Boxes */
    .blog-callout {
      padding: 1rem 1.25rem;
      margin: 1.5rem 0;
      border-radius: 8px;
      border-left: 4px solid;
      background: rgba(255, 255, 255, 0.03);

      &[dir="rtl"] {
        border-left: none;
        border-right: 4px solid;
      }

      p:last-child {
        margin-bottom: 0;
      }

      &.blog-callout-info {
        border-color: #38bdf8;
        background: rgba(56, 189, 248, 0.08);
      }

      &.blog-callout-tip {
        border-color: #43d9ad;
        background: rgba(67, 217, 173, 0.08);
      }

      &.blog-callout-warning {
        border-color: #fea55f;
        background: rgba(254, 165, 95, 0.08);
      }

      &.blog-callout-danger {
        border-color: #f87171;
        background: rgba(248, 113, 113, 0.08);
      }

      &.blog-callout-note {
        border-color: #c98bdf;
        background: rgba(201, 139, 223, 0.08);
      }
    }

    /* Images */
    img {
      max-width: 100%;
      height: auto;
      border-radius: 10px;
      border: 1px solid $lines;
      margin: 1.5rem auto;
      display: block;

      &.ProseMirror-selectednode {
        outline: 2px solid $accent1;
      }
    }

    /* YouTube iframes */
    div[data-youtube-video] {
      margin: 1.5rem 0;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid $lines;

      iframe {
        width: 100%;
        min-height: 380px;
        border: none;
        display: block;
      }
    }

    /* Spoiler blur effect */
    .tg-spoiler {
      background: $secondary4;
      color: transparent;
      filter: blur(5px);
      cursor: pointer;
      border-radius: 4px;
      padding: 1px 4px;
      transition: filter 0.2s, background 0.2s;

      &.revealed,
      &:hover {
        filter: none;
        background: rgba(255, 255, 255, 0.08);
        color: inherit;
      }
    }
  }
}
</style>
