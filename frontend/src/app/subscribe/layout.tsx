export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
        {/* <head>
            <title>Checkout</title>
            <script src="https://js.stripe.com/basil/stripe.js"></script>
        </head> */}
        <body>
            <div>{children}</div>
        </body>
    </>

  )
}