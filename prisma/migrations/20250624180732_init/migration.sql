-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COADMIN', 'USER');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('REFRESH', 'FCM', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_PROCESS', 'OBJECTION', 'REGISTERED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "UpdateType" AS ENUM ('STATUS_UPDATE', 'NOTE', 'FEE_REQUEST');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('ALL', 'SPECIFIC', 'ROLE_BASED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "role" "Role" NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrademarkApplication" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "markName" TEXT NOT NULL,
    "classCode" TEXT,
    "applicantName" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "objectionReason" TEXT,
    "objectionFeeRequired" BOOLEAN NOT NULL DEFAULT false,
    "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrademarkApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentGatewayResponse" JSONB,
    "purpose" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT NOT NULL,
    "parentTransactionId" UUID,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationUpdate" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "updateType" "UpdateType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "audienceType" "AudienceType" NOT NULL,
    "notificationType" TEXT NOT NULL DEFAULT 'general',
    "clickAction" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_code_key" ON "PaymentMethod"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrademarkApplication" ADD CONSTRAINT "TrademarkApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TrademarkApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_parentTransactionId_fkey" FOREIGN KEY ("parentTransactionId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationUpdate" ADD CONSTRAINT "ApplicationUpdate_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "TrademarkApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationUpdate" ADD CONSTRAINT "ApplicationUpdate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
