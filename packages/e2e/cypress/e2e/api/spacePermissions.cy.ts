import { SavedChart, SEED_PROJECT, Space } from '@lightdash/common';

const apiUrl = '/api/v1';

const chartBody = {
    tableName: 'customers',
    metricQuery: {
        dimensions: ['customers_customer_id'],
        metrics: [],
        filters: {},
        limit: 500,
        sorts: [{ fieldId: 'customers_customer_id', descending: false }],
        tableCalculations: [],
        additionalMetrics: [],
    },
    tableConfig: { columnOrder: ['customers_customer_id'] },
    chartConfig: {
        type: 'cartesian',
        config: { layout: {}, eChartsConfig: {} },
    },
    name: 'private chart',
};

const createPrivateChart = (
    callback: (space: Space, chart: SavedChart) => void,
) => {
    cy.request({
        url: `api/v1/projects/${SEED_PROJECT.project_uuid}/spaces`,
        headers: { 'Content-type': 'application/json' },
        method: 'POST',
        body: { name: 'private space' },
    }).then((spaceResponse) => {
        cy.request({
            url: `api/v1/projects/${SEED_PROJECT.project_uuid}/saved`,
            headers: { 'Content-type': 'application/json' },
            method: 'POST',
            body: { ...chartBody, spaceUuid: spaceResponse.body.results.uuid },
        }).then((resp) => {
            expect(resp.status).to.eq(200);
            callback(spaceResponse.body.results, resp.body.results);
        });
    });
};

describe('Lightdash API tests for my own private spaces as admin', () => {
    beforeEach(() => {
        cy.login();
    });
    it('Should identify user', () => {
        cy.request(`${apiUrl}/user`).then((resp) => {
            expect(resp.status).to.eq(200);
            expect(resp.body.results).to.have.property(
                'email',
                'demo@lightdash.com',
            );
            expect(resp.body.results).to.have.property('role', 'admin');
        });
    });

    it('Should create private space', () => {
        cy.request({
            url: `${apiUrl}/projects/${SEED_PROJECT.project_uuid}/spaces`,
            headers: { 'Content-type': 'application/json' },
            method: 'POST',
            body: { name: 'private space' },
        }).then((resp) => {
            expect(resp.status).to.eq(200);
            cy.log(resp.body.results);
            expect(resp.body.results).to.have.property('isPrivate', true);
            expect(resp.body.results).to.have.property('name', 'private space');
            expect(resp.body.results).to.have.property(
                'projectUuid',
                SEED_PROJECT.project_uuid,
            );
        });
    });

    it('Should create chart in private space', () => {
        createPrivateChart((space, chart) => {
            expect(space).to.have.property('isPrivate', true);
            expect(space).to.have.property('name', 'private space');

            expect(chart).to.have.property('spaceName', 'private space');
            expect(chart).to.have.property('spaceUuid', space.uuid);
        });
    });
});

describe('Lightdash API tests for an editor accessing other private spaces', () => {
    let privateChart: SavedChart;
    let privateSpace: Space;
    let email;

    before(() => {
        cy.login();

        createPrivateChart((space, chart) => {
            privateChart = chart;
            privateSpace = space;
        });

        cy.loginWithPermissions('member', [
            {
                role: 'editor',
                projectUuid: SEED_PROJECT.project_uuid,
            },
        ]).then((e) => {
            email = e;
        });
    });
    beforeEach(() => {
        cy.loginWithEmail(email);
    });

    it('Should not view charts in other private spaces', () => {
        cy.request({
            url: `${apiUrl}/saved/${privateChart.uuid}`,
            failOnStatusCode: false,
        }).then((resp) => {
            expect(resp.status).to.eq(403);
        });
    });

    it('Should not get results from  charts in other private spaces', () => {
        cy.request({
            url: `${apiUrl}/saved/${privateChart.uuid}/results`,
            headers: { 'Content-type': 'application/json' },
            method: 'POST',
            body: {},
            failOnStatusCode: false,
        }).then((resp) => {
            expect(resp.status).to.eq(403);
        });
    });

    it('Should not updateMultiple charts in other private spaces', () => {
        cy.request({
            url: `${apiUrl}/projects/${SEED_PROJECT.project_uuid}/saved/`,
            headers: { 'Content-type': 'application/json' },
            method: 'PATCH',
            body: [
                {
                    uuid: privateChart.uuid,
                    name: 'udpated name',
                    description: 'updated description',
                    spaceUuid: privateSpace.uuid,
                },
            ],
            failOnStatusCode: false,
        }).then((resp) => {
            expect(resp.status).to.eq(403);
        });
    });

    it('Should not create chart in other private spaces', () => {
        cy.request({
            url: `api/v1/projects/${SEED_PROJECT.project_uuid}/saved`,
            headers: { 'Content-type': 'application/json' },
            method: 'POST',
            body: { ...chartBody, spaceUuid: privateSpace.uuid },
            failOnStatusCode: false,
        }).then((resp) => {
            expect(resp.status).to.eq(403);
        });
    });
    it('Should not toggle pinning on charts in other private spaces', () => {
        cy.request({
            url: `api/v1/saved/${privateChart.uuid}/pinning`,
            headers: { 'Content-type': 'application/json' },
            method: 'PATCH',
            body: {},
            failOnStatusCode: false,
        }).then((resp) => {
            expect(resp.status).to.eq(403);
        });
    });
});
