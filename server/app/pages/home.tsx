import { o } from '../jsx/jsx.js'
import { prerender } from '../jsx/html.js'
import SourceCode from '../components/source-code.js'
import { ResolvedPageRoute, Routes } from '../routes.js'
import { title } from '../../config.js'
import Style from '../components/style.js'
import { Locale, LocaleVariants } from '../components/locale.js'
import { Script } from '../components/script.js'
import { loadClientPlugin } from '../../client-plugin.js'
import { Router } from 'express'
import { createUploadForm } from '../upload.js'
import { MB } from '@beenotung/tslib/size.js'

// Calling <Component/> will transform the JSX into AST for each rendering.
// You can reuse a pre-compute AST like `let component = <Component/>`.

// If the expression is static (not depending on the render Context),
// you don't have to wrap it by a function at all.

let style = Style(/* css */ `
#previewTable {
  border-collapse: collapse;
}

#previewTable th,
#previewTable td {
  padding: 0.5rem;
}

#previewTable thead tr:nth-child(odd),
#previewTable tbody tr:nth-child(even) {
  background-color: #f0f0f0;
}

#previewTable tr:hover {
  background-color: #e0e0e0 !important;
}


#home .field {
  margin: 1rem;
}`)

let script = Script(/* js */ `
  var rowTemplate = document.querySelector('#home table tbody tr')
  rowTemplate.remove()
  function previewPDF(event) {
    let files = Array.from(event.target.files)
    let tbody = previewTable.querySelector('tbody')
    for (let file of files) {
      let row = rowTemplate.cloneNode(true)
      row.hidden = false
      row.querySelector('.filename').textContent = file.name
      row.querySelector('.size').textContent = format_byte(file.size)
      row.querySelector('.remove').addEventListener('click', () => {
        let index = files.indexOf(file)
        if (index == -1) return
        files.splice(index, 1)
        row.remove()
        let list = new DataTransfer()
        for (let file of files) {
          list.items.add(file)
        }
        pdfForm.files.files = list.files
        previewTable.hidden = files.length == 0
        pdfForm.submitButton.disabled = files.length == 0
      })
      tbody.appendChild(row)
    }
    previewTable.hidden = files.length == 0
    pdfForm.submitButton.disabled = files.length == 0
  }
  previewTable.hidden = true

  function uploadPDF(event) {
    event.preventDefault()
    pdfForm.submitButton.disabled = true
    let formData = new FormData(pdfForm)
    let xhr = new XMLHttpRequest()
    xhr.open(pdfForm.method, pdfForm.action, true)
    xhr.send(formData)
    xhr.onload = () => {
      pdfForm.submitButton.disabled = false
      console.log(xhr.responseText)
    }
    xhr.onerror = () => {
      pdfForm.submitButton.disabled = false
      console.error(xhr.statusText)
    }
    xhr.onprogress = (event) => {
      if (event.lengthComputable) {
        console.log({
          loaded: event.loaded,
          total: event.total,
          percent: event.loaded / event.total,
        })
      }
    }
  }
`)

let formatPlugin = loadClientPlugin({
  entryFile: 'dist/client/format.js',
})

let content = (
  <div id="home">
    <h1>
      <Locale en="Home" zh_hk="主頁" zh_cn="主页" />
    </h1>

    <p>
      <Locale
        en="Compress PDF Documents to meet the size limit of web forms and email attachments"
        zh_hk="壓縮 PDF 文件以符合網頁表單和電子郵件附件的大小限制"
        zh_cn="压缩 PDF 文件以符合网页表单和电子邮件附件的大小限制"
      />
    </p>

    <form
      id="pdfForm"
      action="/api/compress-pdf"
      method="post"
      enctype="multipart/form-data"
      onsubmit="uploadPDF(event)"
    >
      <div class="field">
        <input
          name="files"
          type="file"
          accept=".pdf"
          onchange="previewPDF(event)"
          multiple
        />
      </div>
      <div class="field">
        <table id="previewTable">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Size</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {/* The first row is served as template */}
            <tr hidden>
              <td class="filename">test.pdf</td>
              <td class="size">100KB</td>
              <td>
                <button class="remove">
                  <Locale en="Remove" zh_hk="移除" zh_cn="移除" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="field">
        <button type="submit" disabled name="submitButton">
          <Locale en="Compress PDF" zh_hk="壓縮 PDF" zh_cn="压缩 PDF" />
        </button>
      </div>
    </form>

    <SourceCode page="home.tsx" />

    {script}
    {formatPlugin.node}
  </div>
)

let home = (
  <>
    {style}
    {content}
  </>
)

// And it can be pre-rendered into html as well

let route: LocaleVariants<ResolvedPageRoute> = {
  en: {
    title: title('Home'),
    description:
      'Getting Started with ts-liveview - a server-side rendering realtime webapp framework with progressive enhancement',
    node: prerender(home, { language: 'en' }),
  },
  zh_hk: {
    title: title('主頁'),
    description:
      '開始使用 ts-liveview - 一個具有漸進增強功能的伺服器端渲染即時網頁應用框架',
    node: prerender(home, { language: 'zh_hk' }),
  },
  zh_cn: {
    title: title('主页'),
    description:
      '开始使用 ts-liveview - 一个具有渐进增强功能的服务器端渲染即时网页应用框架',
    node: prerender(home, { language: 'zh_cn' }),
  },
}

function attachRoutes(app: Router) {
  app.post('/api/compress-pdf', async (req, res) => {
    let form = createUploadForm({
      uploadDir: '/tmp/uploads',
      mimeTypeRegex: /^application\/pdf$/,
      maxFileSize: 100 * MB,
      maxFiles: 10,
    })
    let [fields, files] = await form.parse(req)
    console.log(fields, files)
    res.end('ok')
  })
}

let routes = {
  '/': {
    menuText: <Locale en="Home" zh_hk="主頁" zh_cn="主页" />,
    resolve(context) {
      return Locale(route, context)
    },
  },
} satisfies Routes

export default { routes, attachRoutes }
