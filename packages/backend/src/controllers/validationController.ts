import {
    ApiErrorPayload,
    ApiJobScheduledResponse,
    ApiValidateResponse,
    ApiValidationDismissResponse,
    getRequestMethod,
    LightdashRequestMethodHeader,
} from '@lightdash/common';
import { Delete, Get, Post, Query } from '@tsoa/runtime';
import express from 'express';
import {
    Controller,
    Middlewares,
    OperationId,
    Path,
    Request,
    Response,
    Route,
    SuccessResponse,
    Tags,
} from 'tsoa';
import { validationService } from '../services/services';
import { allowApiKeyAuthentication, isAuthenticated } from './authentication';

@Route('/api/v1/projects/{projectUuid}/validate')
@Response<ApiErrorPayload>('default', 'Error')
@Tags('Projects')
export class ValidationController extends Controller {
    /**
     * Validate content inside a project. This will start a validation job and return the job id.
     *
     * Validation jobs scan all charts and dashboards inside a project to find any broken references
     * to metrics or dimensions that aren't available. Results are available after the job is completed.
     * @param projectUuid the projectId for the validation
     * @param req express request
     */
    @Middlewares([allowApiKeyAuthentication, isAuthenticated])
    @SuccessResponse('200', 'Success')
    @Post('/')
    @OperationId('ValidateProject')
    async post(
        @Path() projectUuid: string,
        @Request() req: express.Request,
    ): Promise<ApiJobScheduledResponse> {
        this.setStatus(200);
        const context = getRequestMethod(
            req.header(LightdashRequestMethodHeader),
        );
        return {
            status: 'ok',
            results: {
                jobId: await validationService.validate(
                    req.user!,
                    projectUuid,
                    context,
                ),
            },
        };
    }

    /**
     * Get validation results for a project. This will return the results of the latest validation job.
     * @param projectUuid the projectId for the validation
     * @param req express request
     * @param fromSettings boolean to know if this request is made from the settings page, for analytics
     */
    @Middlewares([allowApiKeyAuthentication, isAuthenticated])
    @SuccessResponse('200', 'Success')
    @Get('/')
    @OperationId('GetLatestValidationResults')
    async get(
        @Path() projectUuid: string,
        @Request() req: express.Request,
        @Query() fromSettings?: boolean,
    ): Promise<ApiValidateResponse> {
        this.setStatus(200);
        return {
            status: 'ok',
            results: await validationService.get(
                req.user!,
                projectUuid,
                fromSettings,
            ),
        };
    }

    /**
     * Deletes a single validation error.
     * @param validationId the projectId for the validation
     * @param req express request
     * @param fromSettings boolean to know if this request is made from the settings page, for analytics
     */
    @Middlewares([allowApiKeyAuthentication, isAuthenticated])
    @SuccessResponse('200', 'Success')
    @Delete('/{validationId}')
    @OperationId('DeleteValidationDismiss')
    async dismiss(
        @Path() validationId: number,
        @Request() req: express.Request,
    ): Promise<ApiValidationDismissResponse> {
        this.setStatus(200);
        await validationService.delete(req.user!, validationId);
        return {
            status: 'ok',
        };
    }
}
