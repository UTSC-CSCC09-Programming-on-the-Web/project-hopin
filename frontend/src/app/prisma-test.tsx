import { prisma } from "@lib/prisma";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";

type Props = InferGetServerSidePropsType<typeof GetServerSideProps>;

export default async function PrismaTest({ user }: Props) {
  return <main className="">Hello, {user?.name}</main>;
}
export const getServerSideProps: GetServerSideProps = async (context) => {
  const user = await prisma.user.findFirst({
    where: {
      email: "test@test.com",
    },
  });
  return {
    props: {
      user,
    },
  };
};
