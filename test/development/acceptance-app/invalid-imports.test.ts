/* eslint-env jest */
import { sandbox } from './helpers'
import { createNextDescribe, FileRef } from 'e2e-utils'
import path from 'path'

createNextDescribe(
  'Error Overlay invalid imports',
  {
    files: new FileRef(path.join(__dirname, 'fixtures', 'default-template')),
    dependencies: {
      react: 'latest',
      'react-dom': 'latest',
      'server-only': 'latest',
      'client-only': 'latest',
    },
    skipStart: true,
  },
  ({ next }) => {
    it('should show error when using styled-jsx in server component', async () => {
      const { session, cleanup } = await sandbox(
        next,
        new Map([
          [
            'app/comp1.js',
            `
          import { Comp2 } from './comp2'

          export function Comp1() {
            return <Comp2 />
          }
          `,
          ],
          [
            'app/comp2.js',
            `
            export function Comp2() {
              return (
                <div>
                  <style jsx>{\`
                    p {
                      color: red;
                    }
                  \`}</style>
                </div>
              )
            }
             
          `,
          ],
          [
            'app/page.js',
            `'use client'
          import { Comp1 } from './comp1'
          
          export default function Page() {
            return <Comp1 />
          }
          `,
          ],
        ])
      )

      const pageFile = 'app/page.js'
      const content = await next.readFile(pageFile)
      const withoutUseClient = content.replace("'use client'", '')
      await session.patch(pageFile, withoutUseClient)

      expect(await session.hasRedbox(true)).toBe(true)
      expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
        "app/comp2.js
        'client-only' cannot be imported from a Server Component module. It should only be used from a Client Component.

        The error was caused by importing 'styled-jsx/style.js' in 'app/comp2.js'.

        Import trace for requested module:
        app/comp2.js
        app/comp1.js
        app/page.js"
      `)

      await cleanup()
    })

    it('should show error when external package imports client-only in server component', async () => {
      const { session, cleanup } = await sandbox(
        next,
        new Map([
          [
            'node_modules/client-only-package/index.js',
            `
            require("client-only")
          `,
          ],
          [
            'node_modules/client-only-package/package.json',
            `
            {
              "name": "client-only-package",
              "main": "index.js"
            }
          `,
          ],
          [
            'app/comp1.js',
            `
          import { Comp2 } from './comp2'

          export function Comp1() {
            return <Comp2 />
          }
          `,
          ],
          [
            'app/comp2.js',
            `
            import "client-only-package"
            export function Comp2() {
              return (
                <div>Hello world</div>
              )
            }
             
          `,
          ],
          [
            'app/page.js',
            `'use client'
          import { Comp1 } from './comp1'
          
          export default function Page() {
            return <Comp1 />
          }
          `,
          ],
        ])
      )

      const pageFile = 'app/page.js'
      const content = await next.readFile(pageFile)
      const withoutUseClient = content.replace("'use client'", '')
      await session.patch(pageFile, withoutUseClient)

      expect(await session.hasRedbox(true)).toBe(true)
      expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
        "app/comp2.js
        'client-only' cannot be imported from a Server Component module. It should only be used from a Client Component.

        The error was caused by importing 'client-only-package/index.js' in 'app/comp2.js'.

        Import trace for requested module:
        app/comp2.js
        app/comp1.js
        app/page.js"
      `)

      await cleanup()
    })

    it('should show error when external package imports server-only in client component', async () => {
      const { session, cleanup } = await sandbox(
        next,
        new Map([
          [
            'node_modules/server-only-package/index.js',
            `
            require("server-only")
          `,
          ],
          [
            'node_modules/server-only-package/package.json',
            `
            {
              "name": "server-only-package",
              "main": "index.js"
            }
          `,
          ],
          [
            'app/comp1.js',
            `
          import { Comp2 } from './comp2'

          export function Comp1() {
            return <Comp2 />
          }
          `,
          ],
          [
            'app/comp2.js',
            `
            import "server-only-package"
            export function Comp2() {
              return (
                <div>Hello world</div>
              )
            }
             
          `,
          ],
          [
            'app/page.js',
            `'use client'
          import { Comp1 } from './comp1'
          
          export default function Page() {
            return <Comp1 />
          }
          `,
          ],
        ])
      )

      const pageFile = 'app/page.js'
      const content = await next.readFile(pageFile)
      await session.patch(pageFile, '"use client"\n' + content)

      expect(await session.hasRedbox(true)).toBe(true)
      expect(await session.getRedboxSource()).toMatchInlineSnapshot(`
        "app/comp2.js
        'server-only' cannot be imported from a Client Component module. It should only be used from a Server Component.

        The error was caused by importing 'server-only-package/index.js' in 'app/comp2.js'.

        Import trace for requested module:
          app/comp2.js
          app/comp1.js
          app/page.js"
      `)

      await cleanup()
    })
  }
)
